extern crate hyper;
extern crate std;

use cache;
use result;

pub trait SimpleClient {
    fn fetch(&self, url: &str) -> result::SimpleResult<String>;
}

pub fn new_client() -> Box<SimpleClient + Sync + Send> {
    return Box::new(CachingWrapper::new(HyperHttpClient::new()));
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
    fn fetch(&self, url: &str) -> result::SimpleResult<String> {
        use std::io::Read;

        let mut response = try!(self.hyper_client.get(url)
                                .header(hyper::header::UserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.110 Safari/537.36".to_owned()))
                                .send()
                                .map_err(|e| result::SimpleError::Uncategorized(format!("{:?}", e))));



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
    fn fetch(&self, url: &str) -> result::SimpleResult<String> {
        match self.cache.lookup(url) {
            Some(data) => {
                println!("Using cached value for '{}'", url);
                return Ok(data);
            },
            None => {
                println!("Re-fetching '{}'", url);
                let response = self.client.fetch(url)?;
                self.cache.insert(url, response.clone());
                return Ok(response);
            }
        }
    }
}
