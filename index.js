/**
 * Created by Mikael Lindahl (mikael) on 1/15/17.
 */

'use strict';

const Client = require( 'sftpjs' );
const Promise = require( 'bluebird' );
const debug = require( 'debug' )( 'text_file_import:index.js' );
const fs = require( 'fs' );
const moment = require( 'moment' );


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
        // this.file_manager_modified = options.file_manager_modified;
        this.getModified = options.getModified;
        this.path_file_manager = options.path_file_manager;
        this.data = [];
        this.files = [];
        //this.files_visible=[];
        this.files_filtered = [];
        this.type = options.type;
        this._promise = Promise.resolve();

        if ( ['ftp', 'disk'].indexOf( this.type ) == -1 ) {

            this._promise = Promise.reject( 'Unsupported type import source type ' + this.type )

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

    if ( !directory ) {

        debug( 'list no directory skipping' );
        return this

    }

    let self = this;

    this._promise = this._promise.then( () => {

        return new Promise( ( resolve, reject ) => {

            if ( self.type == 'disk' ) {

                debug( 'list disk' );

                diskList( directory, resolve )

            } else { //ftp

                debug( 'list ftp' );

                ftpList( directory, self.credentials, resolve, reject )

            }

        } )
    } ).then( ( files ) => {

        // Handle to all files in the directory
        self.files = self.files.concat( files );

        // debug(self.files)

        return {
            listed_files: self.files
        }

    } );

    return this
};

/**
 * Apply filter to filters in directory. Date filter effects the `this.files` attribute
 * whereas the onFileName filter does not.
 *
 *  - `filter(file)` {function} Should return true | false if file should be
 *    included or not
 *    - `file` File data object
 *      - `directory` {string} Directory of file
 *      - `imported_at` {string} Date of import
 *      - `last_modified` {string} Date of last file modification
 *      - `name` {string} Name of file
 *      - `path` {string} Full path to file
 *  `this.files_visible` array.
 *
 * @memberof Adapter
 * @returns {Adapter}
 */
Adapter.prototype.filter = function ( options ) {


    let self = this;

    this._promise = this._promise.then( result => {

        debug( 'filter' );

        let files_filtered;

        if ( options.serialize ) {

            files_filtered = _filterSerialize( result.listed_files, options.serialize )

        } else if ( options.filter ) {

            files_filtered = _filterStandard( result.listed_files, options.filter )

        } else {

            debug( 'filter no filter' );

            files_filtered = files;

        }


        if ( files_filtered.length == 0 ) {

            console.log( 'WARNING in text_file_import no files to load', files_filtered )

        }

        result.files_filtered = files_filtered;

        return result;

    } );

    return this
};

/**
 * Reads file register from the disk
 *
 * - `encoding` encoding to use when reading the file e.g. binary or utf8
 *
 * @memberOf Adapter
 * @returns {Adapter}
 */
Adapter.prototype.readFileManager = function ( encoding ) {

    let self = this;

    if ( !this.path_file_manager ) {

        return this

    }

    this._promise = this._promise.then( result => {

        let path = this.path_file_manager

        return read( [{path}], encoding, self.credentials, self.type )
            .then( data => {

                let file_manager = JSON.parse(data[0].text)

                for ( let name in file_manager ) {

                    if ( file_manager[name].modified < self.getModified() ) {

                        delete file_manager[name]

                    }

                }

                result.file_manager = file_manager

                return result

            } )
    } );

    return this;
};

/**
 * Reads file register from the disk
 *
 * - `encoding` encoding to use when reading the file e.g. binary or utf8
 *
 * @memberOf Adapter
 * @returns {Adapter}
 */
Adapter.prototype.filterFromFileManager = function () {

    let self = this;

    if ( !this.path_file_manager ) {

        return this

    }

    this._promise = this._promise.then( result => {

        let filtered_files = [];
        result.listed_files.forEach( file => {



            if ( result.file_manager[file.name] ) {

                filtered_files.push( file )

            }



        } )

        // debug(filtered_files)
        // // debug(result.file_manager)
        // throw 1

        result.filtered_files = filtered_files
        return result
    } )


    return this;

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

    this._promise = this._promise.then( result => {

        let files = result.filtered_files || result.listed_files
        return read( files,  encoding, self.credentials, self.type )

        // return new Promise( resolve => {
        //
        //     if ( self.type == 'disk' ) {
        //
        //         debug( 'read disk' );
        //         diskRead( files, encoding, resolve )
        //
        //     } else { //ftp
        //
        //         debug( 'read ftp' );
        //         ftpRead( files, encoding, self.credentials, resolve )
        //
        //     }
        //
        // } ).then( data => {
        //
        //     data.forEach( d => {
        //
        //         self.data.push( d )
        //
        //     } );
        //
        //     debug( 'read done' )
        //
        //     return data
        //
        // } );

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

    // let data = this.data;

    this._promise = this._promise.then( data => {

        debug( 'parse' );

        let promise = Promise.resolve();

        data.forEach( d => {

            promise = promise.then( () => {
                let _d = d;
                return parse( _d ).then( json => {

                    _d.json = json;

                } )
            } );
        } );

        promise = promise.then( () => {

            // self.data = data;

            return data

        } );

        return promise

    } );

    return this

};

///**
// *  Serialize content of files into one dataset
// *
// *  - `options`
// *    - `name_full` {string} Filename of file with full snapshot
// *    - `overlap` {integer} Overlap in minutes between full and first incremental
// *  one
// */
//Adapter.prototype.filter_serialize = function(options) {
//
//    if (!options){
//
//        debug( 'filter serialize skip');
//        return this
//
//    }
//
//    let name_full = options.name_full;
//    let overlap =  options.overlap;
//
//    let self=this;
//
//    overlap = overlap ? overlap : 0;
//
//    this._promise = this._promise.then( files => {
//
//        debug( 'serialize filter');
//
//        let full;
//        let filtered = [];
//        files.forEach( d => {
//
//
//            if ( d.name == name_full ) {
//
//                full = d;
//            }
//
//            filtered.push( d )
//
//        } );
//
//
//        if (!full){
//
//            let err = new Error('Missing file with snapshot. Need to set name_full options correct')
//            console.error(err)
//            throw err
//
//        }
//
//        filtered = filtered.sort( ( a, b ) => {
//
//            a = a.last_modified;
//            b = b.last_modified;
//
//            if ( a < b ) {
//
//                return 1
//
//            } else if ( a > b ) {
//
//                return -1
//
//            } else {
//
//                return 0
//
//            }
//
//        } );
//
//        let date_full=moment(full.last_modified).subtract(overlap, 'minutes')
//
//
//        debug( filtered );
//        debug( date_full );
//
//        filtered = filtered.reduce((tot,val)=>{
//
//            let date_inc = moment(val.last_modified);
//
//            debug(date_inc);
//
//            if (date_full<=date_inc){
//
//                tot.push(val)
//
//            }
//
//            return tot
//
//        }, []);
//
//
//        debug(filtered)
//
//
//        debug( 'serialize filter', filtered.length );
//
//        self.files_filtered=filtered;
//
//        return self.files_filtered;
//
//    } )
//
//    return this
//
//}


/**
 *  Serialize content of files into one dataset
 *
 *  - `options`
 *    - `merge` {function} Function that takes to data arrays and merge tem into
 *    - `name_full` {string} Filename of file with full snapshot
 *  one
 */
Adapter.prototype.serialize = function ( options ) {

    if ( !options ) {

        debug( 'serialize skip' );
        return this

    }

    let name_full = options.name_full;
    let serialize = options.merge;

    let self = this;


    this._promise = this._promise.then( () => {

        debug( 'serialize' );

        let full = [];
        let incremental = [];
        self.data.forEach( d => {

            if ( d.file_name == name_full ) {

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

        incremental.forEach( inc => {

            full.json = serialize( full.json, inc.json );

            if ( !full.files_incremental ) {

                full.files_incremental = [inc.file_name];
                full.texts_incremental = [inc.text];

            } else {

                full.files_incremental.push( inc.file_name );
                full.texts_incremental.push( inc.text );
            }


        } );

        self.data = [full];

        return self.data;

    } );

    return this

}

function sortFiles( files ) {

    return files.sort( ( a, b ) => {

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
}

function _filterSerialize( files, serialize ) {

    debug( 'filter serialize' );

    let overlap = serialize.overlap ? serialize.overlap : 0;

    let full;
    let filtered = [];
    files.forEach( d => {


        if ( d.name == serialize.name_full ) {

            full = d;
        }

        filtered.push( d )

    } );


    if ( !full ) {

        let err = new Error( 'Missing file with snapshot. Need to set name_full options correct' )
        console.error( err )
        throw err

    }

    let date_full = moment( full.last_modified ).subtract( overlap, 'minutes' )

    filtered = sortFiles( filtered )

    // debug( filtered );
    // debug( date_full );

    filtered = filtered.reduce( ( tot, val ) => {

        let date_inc = moment( val.last_modified );

        // debug( date_inc );

        if ( date_full <= date_inc ) {

            tot.push( val )

        }

        return tot

    }, [] );

    return filtered


}

function _filterStandard( files, filter ) {

    debug( 'filter standard' );

    let files_filtered = [];

    //let result;
    files.forEach( f => {

        if ( filter( f ) ) {

            files_filtered.push( f )

        }

    } );

    files_filtered = sortFiles( files_filtered )

    return files_filtered


}


function diskList( directory, resolve ) {

    debug( 'diskList' );

    let files = [];

    let _files = fs.readdirSync( directory );

    debug( 'diskList dir', directory, 'no files', _files.length, 'first file:', _files[0] );

    _files.forEach( file => {

        files.push( {

            path: directory + '/' + file,
            name: file,
            directory: directory,
            last_modified: moment( fs.lstatSync( directory + '/' + file ).mtime ).format( 'YYYY-MM-DD HH:mm' ),
            imported_at: moment().format( 'YYYY-MM-DD HH:mm' )

        } )

    } );

    resolve( files );

}


function diskRead( files, encoding, resolve ) {

    debug( 'diskRead' );

    let data = [];

    files.forEach( f => {

        let text = fs.readFileSync( f.path, encoding );
        data.push( {
            text: text,
            file_name: f.name
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

        debug( 'ftpList', directory );

        c.list( directory, function ( err, list ) {
            if ( err ) {
                c.end()
                return reject( err );

            }

            let files = [];
            list.forEach( ( l ) => {

                files.push( {
                    path: directory + '/' + l.name,
                    name: l.name,
                    directory: directory,
                    last_modified: moment( l.date ).format( 'YYYY-MM-DD HH:mm' ),
                    imported_at: moment().format( 'YYYY-MM-DD HH:mm' )
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

        debug( 'ftpRead ', files.length, 'files' );

        files.forEach( f => {

            promise = promise.then( () => {
                return new Promise( resolveInner => {

                    c.get( f.path, function ( err, stream ) {

                        let string = '';

                        counter.open++;

                        if ( err ) {

                            console.error( 'text-file-import ftpRead WARNING: ', f, err );

                            data.push( {
                                text: string,
                                file_name: f.name
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
                                file_name: f.name
                            } );

                            resolveInner()

                        } );

                    } );
                } )
            } )

        } );

        promise.then( () => {

            c.end()

            debug( 'ftpRead done' )
            resolve( data )

        } );

    } ).connect( credentials );
}


function read( files, encoding, credentials, type ) {

    return new Promise( resolve => {

        if ( type == 'disk' ) {

            debug( 'read disk' );
            diskRead( files, encoding, resolve )

        } else { //ftp

            debug( 'read ftp' );
            ftpRead( files, encoding, credentials, resolve )

        }
    } )
}

module.exports = ( options ) => {
    return new Adapter( options )
};
