extern crate handlebars;
extern crate hyper;
extern crate rustc_serialize;
extern crate time;
extern crate xmltree;

use hyper::Client;
use hyper::Server;
use hyper::header::UserAgent;
use hyper::server::Request;
use hyper::server::Response;
use rustc_serialize::json;
use std::fmt::Debug;
use std::fs::File;
use std::io::Read;
use std::io::Write;
use std::path::Path;
use std::str::FromStr;
use time::strptime;
use xmltree::Element;

#[derive(Clone, RustcDecodable, RustcEncodable)]
pub struct DataPoint {
    unix_seconds: i64,
    temperature: i32,
    precipitation_chance: i32,
    dew_point: i32,
    relative_humidity: i32,
}

impl DataPoint {
    fn new() -> DataPoint {
        return DataPoint{
            unix_seconds: 0,
            temperature: 0,
            precipitation_chance: 0,
            dew_point: 0,
            relative_humidity: 0,
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

fn fill_in<T>(vals: Vec<T>, output: &mut Vec<DataPoint>,
           copy_fn: &(Fn(&T, &mut DataPoint))) {
    assert_eq!(vals.len(), output.len());
    for i in 0..vals.len() {
        copy_fn(&vals[i], &mut output[i]);
    }
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

    let mut points : Vec<DataPoint> = vec![];
    points.resize(timestamps.len(), DataPoint::new());

    fill_in(timestamps, &mut points,
            &|ts, ref mut pt| pt.unix_seconds = ts.to_timespec().sec.clone());
    fill_in(temps, &mut points,
            &|temp, ref mut pt| pt.temperature = temp.unwrap_or(0));
    fill_in(precip_pcts, &mut points,
            &|pp, ref mut pt| pt.precipitation_chance = pp.unwrap_or(0));
    fill_in(dew_points, &mut points,
            &|dp, ref mut pt| pt.dew_point = dp.unwrap_or(0));
    fill_in(humidities, &mut points,
            &|h, ref mut pt| pt.relative_humidity = h.unwrap_or(0));

//    println!("# times: {}, # temps: {}", timestamps.len(), temps.len());
//    println!("# times: {}, # precip_pcts: {}", timestamps.len(), precip_pcts.len());
//    assert_eq!(timestamps.len(), temps.len());
//    assert_eq!(timestamps.len(), precip_pcts.len());
//    assert_eq!(timestamps.len(), dew_points.len());
//    assert_eq!(timestamps.len(), humidities.len());
//    for i in 0..temps.len() {
//        if temps[i].is_some() && precip_pcts[i].is_some() && dew_points[i].is_some() && humidities[i].is_some() {
//            points.push(DataPoint {
//                unix_seconds: timestamps[i].to_timespec().sec,
//                temperature: temps[i].unwrap(),
//                precipitation_chance: precip_pcts[i].unwrap(),
//                dew_point: dew_points[i].unwrap(),
//                relative_humidity: humidities[i].unwrap(),
//            });
//        };
//    }

    return points;
}

fn json_data() -> String {
    let client = Client::new();

    let url = format!("http://forecast.weather.gov/MapClick.php?lat=40.731&lon=-73.9881&FcstType=digitalDWML");

    let nws_reply_result = client.get(&url)
        .header(UserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.110 Safari/537.36".to_owned()))
        .send();
    match nws_reply_result {
        Err(ref e) => println!("Error: {:?}", e),
        Ok(ref t) => println!("OK {}", t.status),
    }
    let mut nws_reply = nws_reply_result.unwrap();


    let mut body = String::new();
    nws_reply.read_to_string(&mut body).unwrap();

    let mut logfile = File::create("/tmp/lastresponse.txt").unwrap();
    logfile.write_all(body.as_bytes()).unwrap();

    let points = parse_xml(&body);
    return json::encode(&points).expect("json encode");
}

fn static_page(t: &str) -> String {
    let mut hb = handlebars::Handlebars::new();
    hb.register_template_file("index", &Path::new("./index.html")).ok().unwrap();
    hb.register_template_file("google", &Path::new("./google.js")).ok().unwrap();

    let data = {};
    return hb.render(t, &data).expect("hb render");
}

fn hello(req: Request, res: Response) {
    println!("{}", req.uri);
    match format!("{}", req.uri).as_ref() {
        "/favicon.ico" => res.send("".as_bytes()).unwrap(),
        "/data" => res.send(json_data().as_bytes()).unwrap(),
        "/google.js" => res.send(static_page("google").as_bytes()).unwrap(),
        _ => res.send(static_page("index").as_bytes()).unwrap(),
    }

}

fn main() {
    println!("Running...");
    Server::http("0.0.0.0:3000").unwrap()
        .handle(hello).unwrap();
    println!("Done.");
}
