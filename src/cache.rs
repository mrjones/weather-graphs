extern crate std;

use std::clone::Clone;
use std::collections::HashMap;
use std::marker::Send;
use std::marker::Sync;
use std::option::Option;
use std::sync::Arc;
use std::sync::Mutex;

pub trait Cache<T: Send + Clone> {
    fn lookup(&self, key: &str) -> Option<T>;
    fn insert(&mut self, key: &str, value: T);
}


pub fn new_cache<T: Send + Clone + 'static>() -> (Box<Cache<T> + Sync + Send>) {
    return Box::new(InMemoryCache::new());
}

struct InMemoryCache<T> {
    data: Arc<Mutex<HashMap<String, T>>>,
}

impl<T> InMemoryCache<T> {
    fn new() -> InMemoryCache<T> {
        return InMemoryCache{
            data: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

impl<T: Send + Clone> Cache<T> for InMemoryCache<T> {
    fn lookup(&self, key: &str) -> Option<T> {
        return self.data.lock().unwrap().get(key).map(|x| x.clone());
    }

    fn insert(&mut self, key: &str, value: T) {
        self.data.lock().unwrap().insert(key.to_string(), value);
    }
}
/*
use http;

pub trait Cache2<T: Send + Clone> {
    fn get(&mut self, key: &str) -> http::SimpleResult<T>;
}

struct InMemoryCache2<T> {
    data: Arc<Mutex<HashMap<String, T>>>,
    generate: Box<(Fn(&str) -> http::SimpleResult<T>)>,
}

impl<T> InMemoryCache2<T> {
    fn new(generate_fn: Box<(Fn(&str) -> http::SimpleResult<T>)>) -> InMemoryCache2<T> {
        return InMemoryCache2{
            data: Arc::new(Mutex::new(HashMap::new())),
            generate: generate_fn,
        }
    }
}

impl<T: Send + Clone> Cache2<T> for InMemoryCache2<T> {
    fn get(&mut self, key: &str) -> http::SimpleResult<T> {
        {
            match self.data.lock().unwrap().get(key) {
                Some(v) => return Ok(v.clone()),
                None => (),
            }

            let new_v = (self.generate)(key)?;
            self.data.lock().unwrap().insert(key.to_string(), new_v.clone());
            return Ok(new_v);
        }
    }
}
*/
