extern crate std;

pub type SimpleResult<T> = std::result::Result<T, SimpleError>;

#[derive(Debug)]
pub enum SimpleError {
    Uncategorized(String),
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
