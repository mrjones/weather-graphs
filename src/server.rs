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
use std::io::Read;
use std::path::Path;
use time::strptime;
use xmltree::Element;

#[derive(RustcDecodable, RustcEncodable)]
pub struct DataPoint {
    unix_seconds: i64,
    temperature: i32,
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

    let data = Element::parse(body.as_bytes()).unwrap();

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

    let mut temps = vec![];
    for metric in &location_params.children {
        if metric.name == "temperature" &&
            metric.attributes.get("type") == Some(&"hourly".to_string()) {
            for point in &metric.children {
                temps.push(
                    point.text.clone().expect("temp value")
                    .parse::<i32>().expect("parse"));
            }
        }
    }

    let mut points = vec![];

    println!("# times: {}, # temps: {}", timestamps.len(), temps.len());
    assert_eq!(timestamps.len(), temps.len());
    for i in 0..temps.len() {
        points.push(DataPoint {
            unix_seconds: timestamps[i].to_timespec().sec,
            temperature: temps[i],
        });
    }

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
