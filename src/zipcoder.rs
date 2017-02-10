extern crate std;

use result;

pub struct LatLng {
    pub lat: f32,
    pub lng: f32,
}

pub trait ZipCoder {
    fn to_latlng(&mut self, zipcode: i32) -> result::SimpleResult<LatLng>;
}

pub fn new_zipcoder() -> Box<ZipCoder + std::marker::Send + std::marker::Sync>{
    return Box::new(ZipCoderImpl{});
}

struct ZipCoderImpl {

}

impl ZipCoder for ZipCoderImpl {
    fn to_latlng(&mut self, zipcode: i32) -> result::SimpleResult<LatLng> {
        return Ok(LatLng{lat: 40.731, lng: -73.9881});
    }
}
