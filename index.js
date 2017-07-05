/**
 * Created by Mikael Lindahl (mikael) on 1/15/17.
 */

'use strict';

const Client = require( 'sftpjs' );
const Promise = require( 'bluebird' );
const debug = require( 'debug' )( 'text_file_import:index.js' );
const fs = require( 'fs' );
const moment=require('moment');


/**
 * Class used to import files from disk or over ftp
 *
 * - `options` object with the following keys
 *   - `credentials` sftp credential object with the following keys
 *     - `host` stirng THe sftp host url
 *     - `port`number sftp port to use
 *     - `user string User name for sftp
 *     - `password`string Password for sftp user
 *   - `files_visible` Files in the directory that are visible.
 *   Visibility can be controlled by the filter. Files that are included in the
 *   filter are always visible
 *   - `files_filtered` Filtered set of files
 *   - `type` string source type to import from disk|ftp
 *
 *
 */
class Adapter {

    constructor( options ) {

        // super(options, options);

        this.credentials = options.credentials;
        this.data = [];
        this.files=[];
        this.files_visible=[];
        this.files_filtered=[];
        this.type = options.type;
        this._promise=Promise.resolve();

        if (['ftp', 'disk'].indexOf(this.type) ==-1){

            this._promise=Promise.reject( 'Unsupported type import source type ' + this.type )

        }

    }
}

/**
 *  Replicates promise then behavior for class
 *
 *  - `resolve` A value to resolve
 *
 * @memberof Adapter
 * @returns {Adapter}
 */
Adapter.prototype.then = function ( resolve ) {

    this._promise = this._promise.then( resolve );
    return this
};

/**
 *  Replicates promise catch behavior for class
 *
 *  - `resolve` A value to resolve
 *
 * @memberof Adapter
 * @returns {Adapter}
 */
Adapter.prototype.catch = function ( reject ) {

    this._promise = this._promise.catch( reject );
    return this

};

/**
 * List the content in a directory
 *
 * - `directory` string name of directory to import text files from
 *
 * @memberOf Adapter
 * @returns {Adapter}
 */
Adapter.prototype.list = function ( directory ) {

    if (!directory){

        debug('list no directory skipping');
        return this

    }

    let self = this;

    this._promise = this._promise.then(()=>{

        return new Promise( (resolve, reject)=> {

            if ( self.type == 'disk' ) {

                debug( 'list disk' );

                diskList( directory, resolve )

            } else { //ftp

                debug( 'list ftp' );

                ftpList( directory, self.credentials, resolve, reject )

            }

        } )
    }).then((files)=>{

        // Handle to all files in the directory
        self.files=self.files.concat(files);

        // debug(self.files)

        return self.files

    });

    return this
};

/**
 * Apply filter to filters in directory. Date filter effects the `this.files` attribute
 * whereas the onFileName filter does not.
 *
 *  - `filter` Function function({file object}) which should return a object
 *  with the keys `include` true|false and `visible` true|false. `include`  tells weather the
 *  file should be filtered out and `visible` tells weather it the file should be included in the
 *  `this.files_visible` array.
 *
 * @memberof Adapter
 * @returns {Adapter}
 */
Adapter.prototype.filter = function ( filter ) {

    let self=this;

    this._promise = this._promise.then( files=> {

        if ( !filter ) {

            self.files_filtered = files;
            self.files_visible = files;

            return files
        }

        debug('filter length', filter.length, files);

        //clear
        self.files_filtered = [];
        self.files_visible = [];


        let result;
        files.forEach( f=> {

            result=filter(f)

            if (result.include && result.visible){

                self.files_filtered.push(f)
                self.files_visible.push(f)

            }else if (result.visible){


                self.files_visible.push(f)
            }

        } );


        if ( self.files_filtered.length == 0 ) {

            console.log( 'WARNING in text_file_import no files to load', self.files_filtered )

        }


        self.files_visible = self.files_visible.sort((a,b)=>{

            a=a.name
            b=b.name

            if (a>b){
                return 1
            } else if (a<b){
                return -1
            }else{
                return 0
            }

        });


        self.files_filtered = self.files_filtered.sort((a,b)=>{

            a=a.name;
            b=b.name;

            if (a>b){
                return 1
            } else if (a<b){
                return -1
            }else{
                return 0
            }

        });

        return self.files_filtered;

    } );

    return this
};

/**
 * Reads file content from the disk
 *
 * - `encoding` encoding to use when reading the file e.g. binary or utf8
 *
 * @memberOf Adapter
 * @returns {Adapter}
 */
Adapter.prototype.read = function ( encoding ) {

    let self = this;

    this._promise = this._promise.then( files=> {

        return new Promise( resolve=> {

            if ( self.type == 'disk' ) {

                debug( 'read disk' );
                diskRead( files, encoding, resolve )

            } else { //ftp

                debug( 'read ftp' );
                ftpRead( files, encoding, self.credentials, resolve )

            }

        } ).then( data=> {

            data.forEach( d=> {

                self.data.push( d )

            } );

            debug('read done')

            return data

        } );

    } );

    return this

};

/**
 * Parse the into into json (could be any structure actually)
 *
 * `parse` function function([object]) where object has the keys
 * `text` and `file`. Text is the raw file content and file is the
 * filename. It returns a promise wHich resolves into the parsed data
 *
 * @memberOf Adapter
 * @returns {Adapter}
 */
Adapter.prototype.parse = function ( parse ) {

    let data = this.data;

    this._promise = this._promise.then( () => {

        debug( 'parse');

        let promise = Promise.resolve();

        data.forEach( d=> {

            promise = promise.then(()=>{
                let _d=d;
                return parse( _d ).then( json=> {

                    _d.json = json;


                    // resolve(json)

                } )
            }) ;
            // new Promise( resolve=> {
            //
            //     parse( d ).then( json=> {
            //
            //         d.json = json;
            //
            //         resolve(json)
            //     } )
            // } );
        } );

        promise =  promise.then(()=>{

            return data

        });

        return promise

    } );

    return this

};

/**
 *  Serialize content of files into one dataset
 *
 *  - `options`
 *    - `merge` {function} Function that takes to data arrays and merge tem into
 *    - `path_full` {string} Filename of file with full snapshot
 *    - `overlap` {integer} Overlap in minutes between full and first incremental
 *  one
 */
Adapter.prototype.serialize = function(options) {

    let name_full = options.name_full;
    let serialize = options.merge;
    let overlap =  options.overlap;

    if (!options){

        debug( 'serialize skip');
        return this

    }

    let self=this;

    overlap = overlap ? overlap : 0;

    this._promise = this._promise.then( () => {

        debug( 'serialize' , self.data);

        let full = [];
        let incremental = [];
        self.data.forEach( d => {

            if ( d.file == name_full ) {

                full = d;
                return
            }

            incremental.push( d )

        } );

        debug( 'serialize incremental', incremental.length );

        incremental = incremental.sort( ( a, b ) => {

            a = a.last_modified;
            b = b.last_modified;

            if ( a < b ) {

                return 1

            } else if ( a > b ) {

                return -1

            } else {

                return 0

            }

        } );

        let date_full=moment(full.last_modified).subtract(overlap, 'minutes')
        incremental = incremental.reduce((tot,val)=>{

            let date_inc = moment(val.last_modified);

            if (date_full<=date_inc){

                tot.push(val)

            }

            return tot

        }, []);

        incremental.forEach( inc => {

            full = serialize( full, inc )

        } );

        self.data=full;

        return full;

    } )

    return this

}

function diskList( directory, resolve ) {

    debug( 'diskList' );

    let files = [];

    let _files = fs.readdirSync( directory );

    debug( 'diskList dir', directory, 'no files', _files.length, 'first file:',_files[0] );

    _files.forEach( file => {

        files.push( {
            path: directory + '/' + file,
            name: file,
            directory: directory,
            last_modified: moment(fs.lstatSync(directory + '/' + file).mtime).format('YYYY-MM-DD HH:mm')

        } )

    } );

    resolve( files );

}


function diskRead( files, encoding, resolve ) {

    debug( 'diskRead' );

    let data = [];

    files.forEach( f=> {

        let text = fs.readFileSync( f.path, encoding );
        data.push( {
            text: text,
            file: f.name,
            last_modified: f.last_modified
        } )

    } );

    resolve( data )
}

/**
 *  List files in directory over ftp
 *
 * - `directory` Directory to list files in
 * - `credentials` ftp credentials
 *   - `host` host address
 *   - `port` host port to connect to
 *   - `user` user to login with
 *   - `password` password to login with
 * - `resolve` promise resolve handler
 *   @returns {promise} list with files in directory
 */
function ftpList( directory, credentials, resolve, reject ) {

    var c = Client();
    c.on( 'ready', function () {

        debug('ftpList', directory)

        c.list( directory, function ( err, list ) {
            if ( err ){
                c.end()
                return reject( err );

            }

            let files = [];
            list.forEach( ( l )=> {

                files.push( {
                    path: directory + '/' + l.name,
                    name: l.name,
                    directory: directory,
                    last_modified: moment(l.date).format('YYYY-MM-DD HH:mm')
                } )
            } );

            c.end();
            resolve( files )

        } );
    } ).connect( credentials );
}

/**
 *  Read files over ftp
 *
 * - `files` List with files paths to read
 * - `encoding` Type of encoding to read files with
 * - `credentials` ftp credentials
 *   - `host` host address
 *   - `port` host port to connect to
 *   - `user` user to login with
 *   - `password` password to login with
 * - `resolve` promise resolve handler
 *   @returns {promise} list with data from each file
 */
function ftpRead( files, encoding, credentials, resolve ) {


    let data = [];

    let counter = { open: 0, closed: 0 };

    var c = Client();
    c.on( 'ready', function () {

        let promise = Promise.resolve();

        debug('ftpRead ', files.length, 'files')

        files.forEach( f=> {

            promise = promise.then( ()=> {
                return new Promise( resolveInner=> {

                    c.get( f.path, function ( err, stream ) {

                        let string = '';

                        counter.open++;

                        if ( err ){

                            console.error('text-file-import ftpRead WARNING: ', err);

                            data.push( {
                                text: string,
                                file: f.name,
                                last_modified: f.last_modified
                            } );

                            return resolveInner()

                        }

                        stream.on( 'data', function ( buffer ) {

                            // debug( f.path, 'c.on data' );
                            string += buffer.toString( encoding );

                        } );

                        stream.on( 'close', function ( response ) {
                            counter.closed++;

                            // c.end();

                            data.push( {
                                text: string,
                                file: f.name,
                                last_modified: f.last_modified
                            } );

                            resolveInner()

                        } );

                    } );
                } )
            } )

        } );

        promise.then( ()=> {

            c.end()

            debug( 'ftpRead done' )
            resolve( data )

        } );

    } ).connect( credentials );
}


module.exports = ( options )=> {
    return new Adapter( options )
};
