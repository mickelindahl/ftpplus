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

## API

<a name="Adapter"></a>

## Adapter
Class used to import files from disk or over ftp

- `options` object with the following keys
  - `credentials` sftp credential object with the following keys
    - `host` stirng THe sftp host url
    - `port`number sftp port to use
    - `user string User name for sftp
    - `password`string Password for sftp user
  - `files_visible` Files in the directory that are visible.
  Visibility can be controlled by the filter. Files that are included in the
  filter are always visible
  - `files_filtered` Filtered set of files
  - `type` string source type to import from disk|ftp

**Kind**: global class  

* [Adapter](#Adapter)
    * [.then()](#Adapter+then) ⇒ <code>[Adapter](#Adapter)</code>
    * [.catch()](#Adapter+catch) ⇒ <code>Adaptere</code>
    * [.list()](#Adapter+list) ⇒ <code>[Adapter](#Adapter)</code>
    * [.filter()](#Adapter+filter) ⇒ <code>[Adapter](#Adapter)</code>
    * [.read()](#Adapter+read) ⇒ <code>[Adapter](#Adapter)</code>
    * [.parse()](#Adapter+parse) ⇒ <code>[Adapter](#Adapter)</code>

<a name="Adapter+then"></a>

### adapter.then() ⇒ <code>[Adapter](#Adapter)</code>
Replicates promise then behavior for class

 - `resolve` A value to resolve

**Kind**: instance method of <code>[Adapter](#Adapter)</code>  
<a name="Adapter+catch"></a>

### adapter.catch() ⇒ <code>Adaptere</code>
Replicates promise catch behavior for class

 - `resolve` A value to resolve

**Kind**: instance method of <code>[Adapter](#Adapter)</code>  
<a name="Adapter+list"></a>

### adapter.list() ⇒ <code>[Adapter](#Adapter)</code>
List the content in a directory

- `directory` string name of directory to import text files from

**Kind**: instance method of <code>[Adapter](#Adapter)</code>  
<a name="Adapter+filter"></a>

### adapter.filter() ⇒ <code>[Adapter](#Adapter)</code>
Apply filter to filters in directory. Date filter effects the `this.files` attribute
whereas the onFileName filter does not.

 - `filter` Function function({file object}) which should return a object
 with the keys `include` true|false and `visible` true|false. `include`  tells weather the
 file should be filtered out and `visible` tells weather it the file should be included in the
 `this.files_visible` array.

**Kind**: instance method of <code>[Adapter](#Adapter)</code>  
<a name="Adapter+read"></a>

### adapter.read() ⇒ <code>[Adapter](#Adapter)</code>
Reads file content from the disk

- `encoding` encoding to use when reading the file e.g. binary or utf8

**Kind**: instance method of <code>[Adapter](#Adapter)</code>  
<a name="Adapter+parse"></a>

### adapter.parse() ⇒ <code>[Adapter](#Adapter)</code>
Parse the into into json (could be any structure actually)

`parse` function function([object]) where object has the keys
`text` and `file`. Text is the raw file content and file is the
filename. It returns a promise wHich resolves into the parsed data

**Kind**: instance method of <code>[Adapter](#Adapter)</code>  
<a name="ftpList"></a>

## ftpList() ⇒ <code>promise</code>
List files in directory over ftp

- `directory` Directory to list files in
- `credentials` ftp credentials
  - `host` host address
  - `port` host port to connect to
  - `user` user to login with
  - `password` password to login with
- `resolve` promise resolve handler

**Kind**: global function  
**Returns**: <code>promise</code> - list with files in directory  
<a name="ftpRead"></a>

## ftpRead() ⇒ <code>promise</code>
Read files over ftp

- `files` List with files paths to read
- `encoding` Type of encoding to read files with
- `credentials` ftp credentials
  - `host` host address
  - `port` host port to connect to
  - `user` user to login with
  - `password` password to login with
- `resolve` promise resolve handler

**Kind**: global function  
**Returns**: <code>promise</code> - list with data from each file  
## Tests

  Lab.cmd

## Contributing

In lieu of a formal styleguide, take care to maintain the existing coding style.
Add unit tests for any new or changed functionality. Lint and test your code.

## Release History

* 0.1.0 Initial release

