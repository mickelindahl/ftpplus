/**
 * Created by s057wl on 2016-07-14.
 */

'use strict';

const Ftp = require( 'jsftp' );
const Promise = require( 'bluebird' );
const debug = require( 'debug' )( 'ftpplus' );

let _options; // handle for options

function fetch( options, done ) {

    _options = options;

    return new Promise( ( resolve, reject )=> {

        try {

            var ftp = new Ftp( _options.auth );
            _options.ftp = ftp;

            debug( 'ftp created' );

            resolve()
        } catch ( err ) {

            reject( err )

        }

    } ).then( ()=> {

        return new Promise( ( resolve, reject )=> {
            _options.ftp.list( _options.path, function ( err, res ) {

                if ( err ) return reject( err );

                _options.files = toFiles( res );

                debug( 'files parsed', _options.files )

                resolve();

            } );
        } )
    } ).then( ()=> {

        return get_data()

    } ).then( ( results )=> {

         return results

    } ).catch( ( err )=> {

        throw err

    } );

}

function toFiles( ls ) {

    var files = [];
    if ( ls == undefined ) {
        return files
    }

    var i = 0;
    ls.split( '\r\n' ).forEach( function ( str ) {
        var file = str.split( ' ' ).pop();

        debug( 'filter:', _options.filter,'file:', file );

        if ( _options.filter && _options.filter.indexOf( file ) == -1 ) {
            return
        }

        if ( _options.exclude && _options.exclude.indexOf( file ) != -1 ) {
            return
        }

        if ( file == '' ) {
            return
        }
        if ( i >= _options.limit ) {
            return
        }
        files.push( file );
        i += 1;
    } );

    return files

}

function stream( file ) {

    return new Promise( ( resolve, reject )=> {

        var str = '';
        // console.debug('path', path)
        _options.ftp.get( _options.path + file, function ( err, socket ) {


            if ( err ) {
                return reject( {
                    text: str,
                    file: file,
                    err: err,
                } );
            };

            socket.on( "data", function ( buffer ) {

                // binary encoding needed for loken
                if ( _options.encoding != undefined ) {
                    str += buffer.toString( _options.encoding );
                } else {
                    str += buffer.toString();
                }

            } );

            socket.on( "close", function ( err ) {
                if ( err ) {
                    return reject( {
                        text: str,
                        file: file,
                        err: err,
                    } );

                }

                if ( _options.bar != undefined && _options.files ) {
                    _options.bar.setTotal( _options.files.length ).tick( 'Fetching: ' + file )
                };

                debug( 'close stream ' + file );

                str = _options.skip && _options.skip.fun( str, _options.skip.options ) ? '' : str;

                resolve( {
                    text: str,
                    file: file
                } );
            } );
            socket.resume();
        } )
    } ).then( ( resolved )=> {

        if ( _options.to_json) {

            debug('resolved.text', resolved.text)
            // debug(options.post_process)
            return _options.to_json( resolved.text ).then( ( json )=> {

                debug( 'parsing to json done' );

                resolved.json = json;
                return resolved;
            } )

        } else return resolved;

    } ).catch( ( err )=> {

        throw err

    } )
}

function get_data() {

    // start with current being an "empty" already-fulfilled promise
    var current = Promise.resolve();

    return Promise.all( _options.files.map( ( file )=> {
        current = current.then( function () {

            debug( 'promise.all step' )

            return stream( file )
        } );

        return current;

    } ) ).then( ( resolved )=> {

        let results = {};

        results.text = resolved.reduce( ( tot, e )=> {
            return tot.concat( e.text )
        }, [] );

        if ( _options.to_json ) {

            results.json = resolved.reduce( ( tot, e )=> {
                return tot.concat( e.json )
            }, [] );

        }

        return resolved;

    } );
}

module.exports = {
    'fetch': fetch
}