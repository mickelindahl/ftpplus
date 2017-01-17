Text file import
=======

A small library use to import text data (ascii) from disk or over ftp in a directory with filter functionality

## Installation

  npm install git+ssh://git@github.com/mickelindahl/grassy_text_file_import.git

## Usage
```js
let ftp = new Adapter( {
    credentials: {
        host: process.env.HOST,
        user: process.env.USER,
        password: process.env.PASS,
    },
    type: 'ftp'
} )

ftp.list( 'a directory' )
    .filter( { type: 'include', files: ['a file to include'] } )
    .read( 'binary' )
    .parse(parse.crews)
    .then( data=>[

           //do something with data    
        
    ] );
```

## Tests

  Lab.cmd

## Contributing

In lieu of a formal styleguide, take care to maintain the existing coding style.
Add unit tests for any new or changed functionality. Lint and test your code.

## Release History

* 0.1.0 Initial release

