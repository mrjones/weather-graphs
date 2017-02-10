extern crate hyper;
extern crate std;

use cache;

#[derive(Debug)]
pub enum SimpleError {
    Uncategorized(String),
}

pub trait SimpleClient {
    fn fetch(&self, url: &str) -> std::result::Result<String, SimpleError>;
}

pub fn new_client() -> Box<SimpleClient + Sync + Send> {
    return Box::new(CachingWrapper::new(HyperHttpClient::new()));
}

impl std::fmt::Display for SimpleError {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match *self {
            SimpleError::Uncategorized(ref e) => std::fmt::Display::fmt(e, f),
        }
    }
}

impl std::error::Error for SimpleError {
    fn description(&self) -> &str {
        match *self {
            SimpleError::Uncategorized(ref str) => str,
        }
    }

    fn cause(&self) -> Option<&std::error::Error> {
        return None
    }
}

impl From<std::io::Error> for SimpleError {
    fn from(err: std::io::Error) -> SimpleError {
        return SimpleError::Uncategorized(format!("{:?}", err));
    }
}

struct HyperHttpClient {
    hyper_client: hyper::Client,
}

impl HyperHttpClient {
    fn new() -> HyperHttpClient {
        return HyperHttpClient{
            hyper_client: hyper::Client::new(),
        }
    }
}

impl SimpleClient for HyperHttpClient {
    fn fetch(&self, url: &str) -> std::result::Result<String, SimpleError> {
        use std::io::Read;

        let mut response = try!(self.hyper_client.get(url)
                                .header(hyper::header::UserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.110 Safari/537.36".to_owned()))
                                .send()
                                .map_err(|e| SimpleError::Uncategorized(format!("{:?}", e))));



        let mut body = String::new();
        try!(response.read_to_string(&mut body));
        return Ok(body);
    }
}

struct CachingWrapper {
    client: Box<SimpleClient + std::marker::Send + std::marker::Sync>,
    cache: Box<cache::Cache<String> + std::marker::Send + std::marker::Sync>,
}

impl CachingWrapper {
    fn new<C: SimpleClient + Send + Sync + 'static>(c: C) -> CachingWrapper {
        return CachingWrapper{
            client: Box::new(c),
            cache: cache::new_cache::<String>(),
        }
    }
}

impl SimpleClient for CachingWrapper {
    fn fetch(&self, url: &str) -> std::result::Result<String, SimpleError> {
        match self.client.fetch(url) {
            Err(e) => return Err(e),
            Ok(response) => {
//                self.cache.insert(url, response);
                return Ok(response);
            }
        }
    }
}
