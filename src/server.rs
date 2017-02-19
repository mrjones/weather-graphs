extern crate getopts;
extern crate handlebars;
extern crate hyper;
extern crate rustc_serialize;
extern crate time;
extern crate xmltree;

use hyper::Server;
use hyper::server::Request;
use hyper::server::Response;
use rustc_serialize::json;
use std::fmt::Debug;
use std::fs::File;
use std::io::Read;
use std::io::Write;
use std::str::FromStr;
use time::strptime;
use xmltree::Element;

mod cache;
mod http;
mod result;
mod zipcoder;

#[derive(Clone, RustcDecodable, RustcEncodable)]
pub struct DataPoint {
    unix_seconds: i64,
    temperature: i32,
    precipitation_chance: i32,
    dew_point: i32,
    relative_humidity: i32,
    clouds: i32,
    wind: i32,
}

impl DataPoint {
    fn new() -> DataPoint {
        return DataPoint{
            unix_seconds: 0,
            temperature: 0,
            precipitation_chance: 0,
            dew_point: 0,
            relative_humidity: 0,
            clouds: 0,
            wind: 0,
        };
    }
}

fn parse_region<T: FromStr + Debug>(
    e: &xmltree::Element,
    predicate: &(Fn(&xmltree::Element) -> bool)) -> Vec<Option<T>>
    where <T as FromStr>::Err: Debug
{
    let mut res = vec![];

    for child in &(e.children) {
        if predicate(&child) {
            for point in &(child.children) {
                match point.text {
                    Some(ref text) => res.push(Some(
                        text.parse().expect("parsing"))),
                    None => res.push(None),
                }
            }
        }
    }

    return res
}

fn fill_in<T>(vals: Vec<Option<T>>, output: &mut Vec<DataPoint>,
              copy_fn: &(Fn(&T, &mut DataPoint))) -> usize {
    assert_eq!(vals.len(), output.len());

    let mut valid_count = 0;
    for i in 0..vals.len() {
        match vals[i] {
            Some(ref v) => {
                copy_fn(v, &mut output[i]);
                valid_count = valid_count + 1;
            }
            None => {}
        }
    }

    return valid_count;
}

fn matches(e: Option<&String>, val: &str) -> bool{
    return e.is_some() && e.unwrap() == &String::from(val);
}

fn parse_xml(data: &String) -> Vec<DataPoint> {
    let data = Element::parse(data.as_bytes()).unwrap();

    let time_layout = data
        .get_child("data").expect("data")
        .get_child("time-layout").expect("time-layout");

    let location_params = data
        .get_child("data").expect("data")
        .get_child("parameters").expect("parameters");

    let mut timestamps = vec![];
    for time_layout_elem in &time_layout.children {
        if time_layout_elem.name == "start-valid-time" {
            let str = time_layout_elem.text.as_ref().expect("time-value");
            // TODO(mrjones): this is dropping the timezone
            // since it is formatted as "-04:00" instead of "-0400"
            let tm = strptime(str, "%Y-%m-%dT%H:%M:%S%z")
                .expect(format!("parsing: {}", str).as_ref());
            timestamps.push(tm);
        }
    }

    let temps = parse_region::<i32>(
        &location_params,
        &|e| e.name == "temperature" &&
             matches(e.attributes.get("type"), "hourly"));

    let precip_pcts = parse_region::<i32>(
        &location_params,
        &|e| e.name == "probability-of-precipitation");

    let dew_points = parse_region::<i32>(
        &location_params,
        &|e| e.name == "temperature" &&
             matches(e.attributes.get("type"), "dew point"));

    let humidities = parse_region::<i32>(
        &location_params,
        &|e| e.name == "humidity" &&
             matches(e.attributes.get("type"), "relative"));

    let clouds = parse_region::<i32>(
        &location_params,
        &|e| e.name == "cloud-amount");

    let wind = parse_region::<i32>(
        &location_params,
        &|e| e.name == "wind-speed" &&
             matches(e.attributes.get("type"), "sustained"));

    let mut points : Vec<DataPoint> = vec![];
    points.resize(timestamps.len(), DataPoint::new());

    for i in 0..timestamps.len() {
        points[i].unix_seconds = timestamps[i].to_timespec().sec;
    }

    let num_valid = vec![
        fill_in(temps, &mut points,
                &|temp, ref mut pt| pt.temperature = *temp),
        fill_in(precip_pcts, &mut points,
                &|pp, ref mut pt| pt.precipitation_chance = *pp),
        fill_in(dew_points, &mut points,
                &|dp, ref mut pt| pt.dew_point = *dp),
        fill_in(humidities, &mut points,
                &|h, ref mut pt| pt.relative_humidity = *h),
        fill_in(clouds, &mut points,
                &|c, ref mut pt| pt.clouds = *c),
        fill_in(wind, &mut points,
                &|w, ref mut pt| pt.wind = *w)
    ];

    let valid_count = num_valid.into_iter().min().unwrap_or(0);
    return points.into_iter().take(valid_count).collect();
}

fn json_data(latlng: &zipcoder::LatLng, client: &http::SimpleClient) -> String {
    //    let url = format!("http://forecast.weather.gov/MapClick.php?lat=40.731&lon=-73.9881&FcstType=digitalDWML");
    let url = format!("http://forecast.weather.gov/MapClick.php?lat={}&lon={}&FcstType=digitalDWML", latlng.lat, latlng.lng);
    let nws_reply_result = client.fetch(&url);

    match nws_reply_result {
        Err(ref e) => println!("Error: {:?}", e),
        Ok(_) => println!("OK!"),
    }
    let body = nws_reply_result.unwrap();

    let mut logfile = File::create("/tmp/lastresponse.txt").unwrap();
    logfile.write_all(body.as_bytes()).unwrap();

    let points = parse_xml(&body);
    return json::encode(&points).expect("json encode");
}

fn static_page(t: &str) -> String {
    let mut f = std::fs::File::open(t).expect(
        format!("Opening file: {}", t).as_str());
    let mut s = String::new();
    f.read_to_string(&mut s).expect(format!("Reading file: {}", t).as_str());
    return s;
}

struct WeatherServer {
    client: Box<http::SimpleClient + std::marker::Send + std::marker::Sync>,
    zipcoder: Box<zipcoder::ZipCoder + std::marker::Send + std::marker::Sync>,
}

impl WeatherServer {
    fn new() -> WeatherServer {
        return WeatherServer{
            client: http::new_client(),
            zipcoder: zipcoder::new_zipcoder(),
        };
    }
}

impl hyper::server::Handler for WeatherServer {
//impl WeatherServer {
    fn handle(&self, req: Request, res: Response) {
        println!("{}", req.uri);
        match format!("{}", req.uri).as_ref() {
            "/favicon.ico" => res.send("".as_bytes()).unwrap(),
            "/d3dash" => res.send(static_page("d3dash.html").as_bytes()).unwrap(),
            "/d3dash.js" => res.send(static_page("d3dash.js").as_bytes()).unwrap(),
            "/nws.js" => res.send(static_page("nws.js").as_bytes()).unwrap(),
            "/data" => {
                match self.zipcoder.to_latlng(10003) {
                    Ok(latlng) => {
                        res.send(json_data(&latlng, self.client.as_ref()).as_bytes()).unwrap();
                    },
                    Err(err) => res.send(format!("ERROR: {}", err).as_bytes()).unwrap(),
                };
            },
            "/google.js" => res.send(static_page("google.js").as_bytes()).unwrap(),
            _ => res.send(static_page("index.html").as_bytes()).unwrap(),
        }
    }
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let mut opts = getopts::Options::new();
    opts.optopt("s", "static_dir", "Location of static files", "DIR");
    opts.optopt("p", "port", "Port to bind to", "PORT");

    let matches = match opts.parse(&args[1..]) {
        Ok(m) => { m },
        Err(e) => { panic!(e.to_string()); },
    };

    let static_dir = matches.opt_str("s").unwrap_or("./".to_string());
    let port = matches.opt_str("p").unwrap_or("3000".to_string())
        .parse::<u16>().expect("Couldn't parse port!");

    let s = WeatherServer::new();

    println!("--- Running!");
    println!("---       Port: {}", port);
    println!("--- Static dir: {}", static_dir);
    println!("---");
    Server::http(
        std::net::SocketAddr::V4(
            std::net::SocketAddrV4::new(
                std::net::Ipv4Addr::new(0, 0, 0, 0),
                port))).unwrap()
        .handle(s).unwrap();
//        .handle(move |req: Request, resp: Response| {
//            s.lock().unwrap().handle(req, resp);
//        }).unwrap();
    println!("Done.");
}
