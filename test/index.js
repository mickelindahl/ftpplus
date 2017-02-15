/**
 * Created by s057wl on 2016-07-14.
 */
'use strict';

const Mock = require( 'mock-require' );
const EventEmitter = require( 'events' );

//TODO: rewrite tests

class MySocket extends EventEmitter {

    constructor( auth ) {
        super( auth, auth );
        this.resume = ()=> {
        };
    }
}

function ftp( auth ) {

    if ( auth.error ) {
        throw 'error'
    }
    ;

    debug( auth )
    return {
        list: ( path, done )=> {

            if ( auth.list_error ) {
                return done( 'list_error' )
            }
            if ( auth.no_files ) {
                return done( null, undefined )
            }
            done( null, Fs.readFileSync( __dirname + '/list_files.txt', 'binary' ) )

        },
        get: ( path, done )=> {

            if ( auth.get_error ) return done( 'get_error' );

            let my_socket = new MySocket();

            done( null, my_socket );

            let data = Fs.readFileSync( __dirname + '/data.xml', 'binary' );

            for ( let i = 0; i < data.length / 10; i++ ) {

                my_socket.emit( 'data', data.slice( i * 10, (i + 1) * 10 ) )

            }

            if ( auth.close_error ) return my_socket.emit( 'close', 'close_error' );

            my_socket.emit( 'close', null )

        },

    }
}

Mock( 'sftpjs', ftp );

const Code = require( 'code' );   // assertion library
const Lab = require( 'lab' );
const Path = require( 'path' );
const IO = require( '../index' );
const Fs = require( 'fs' );
const debug = require( 'debug' )( 'text_file_import:test:index.js' );
const Parse = require( 'parse' );
const ParseString = require( 'xml2js' ).parseString;
const Promise = require( 'bluebird' );

var lab = exports.lab = Lab.script();
var root = Path.resolve();

require( 'dotenv' ).config( { path: root + '/testenv' } );

var auth = {
    host: 'me.com',
    port: 1111,
    user: 'dawg',
    pass: 'secret'
};

lab.experiment( 'text file import', function () {

    lab.before( {}, function ( done ) {
        done();
    } );

    lab.test( 'fetch with parse', function ( done ) {
        var options = {
            type:'disk',
            path: '/home/dawg/files',
            encoding: 'binary',
            to_json: ( text )=> {

                return new Promise( ( resolve, reject )=> {

                    ParseString( text, function ( err, result ) {

                        if ( err ) reject( err );

                        debug( 'Timetable to xml done' );

                        resolve( result );
                    } )
                } )
            }
        };

        IO.fetch( options ).then( ( results )=> {

            Code.expect( results ).to.be.an.array();
            Code.expect( results.length ).to.equal( 6 );
            done();

        } )
    } );

    // lab.test( 'fetch no to_json, no encoding, limit, skip and bar', function ( done ) {
    //     var options = {
    //         auth: auth,
    //         path: process.env.FTP_PATH_PERS,
    //         limit: 2,
    //         bar: {
    //             setTotal: ()=> {
    //                 return {
    //                     tick: ()=> {
    //                     }
    //                 }
    //             }
    //         },
    //         skip: {
    //             fun: ()=> {
    //                 return true
    //             }
    //         }
    //     };
    //
    //     Ftp.fetch( options ).then( ( results )=> {
    //
    //         Code.expect( results ).to.be.an.array();
    //         Code.expect( results.length ).to.equal( 2 );
    //         done();
    //     } )
    // } );
    //
    // lab.test( 'fetch with filter', function ( done ) {
    //     var options = {
    //         auth: auth,
    //         path: process.env.FTP_PATH_PERS,
    //         encoding: 'binary',
    //         filter: ( f )=> {
    //             return {
    //                 include: ['test.xml'].indexOf( f.name ),
    //                 exists: true
    //             }
    //         }
    //     };
    //
    //     Ftp.fetch( options ).then( ( results )=> {
    //
    //         Code.expect( results ).to.be.an.array();
    //         Code.expect( results.length ).to.equal( 1 );
    //         done();
    //     } )
    // } );
    //
    // lab.test( 'fetch with exclude', function ( done ) {
    //     var options = {
    //         auth: auth,
    //         path: process.env.FTP_PATH_PERS,
    //         encoding: 'binary',
    //         exclude: ['test.xml']
    //     };
    //
    //     Ftp.fetch( options ).then( ( results )=> {
    //
    //         Code.expect( results ).to.be.an.array();
    //         Code.expect( results.length ).to.equal( 5 );
    //         done();
    //
    //     } )
    // } );
    //
    // lab.test( 'fetch ftp no files', function ( done ) {
    //     var options = {
    //         auth: { 'no_files': true },
    //     };
    //
    //     Ftp.fetch( options ).then( ( results )=> {
    //
    //         Code.expect( results ).to.be.an.array();
    //         Code.expect( results.length ).to.equal( 0 );
    //         done();
    //
    //     } )
    // } );
    //
    // lab.test( 'fetch ftp error', function ( done ) {
    //     var options = {
    //         auth: { 'error': true },
    //     };
    //
    //     Ftp.fetch( options ).catch( ( err )=> {
    //
    //         Code.expect( err ).to.equal( 'error' );
    //         done()
    //
    //     } )
    // } );
    //
    // lab.test( 'fetch ftp.list error', function ( done ) {
    //     var options = {
    //         auth: { 'list_error': true },
    //     };
    //
    //     Ftp.fetch( options ).catch( ( err )=> {
    //
    //         Code.expect( err ).to.equal( 'list_error' );
    //         done()
    //
    //     } )
    // } );
    //
    // lab.test( 'fetch ftp.get error', function ( done ) {
    //     var options = {
    //         auth: { 'get_error': true },
    //     };
    //
    //     Ftp.fetch( options ).catch( ( err )=> {
    //
    //         Code.expect( err.err ).to.equal( 'get_error' );
    //         done()
    //
    //     } )
    // } );
    //
    // lab.test( 'fetch ftp.close error', function ( done ) {
    //     var options = {
    //         auth: { 'close_error': true },
    //     };
    //
    //     Ftp.fetch( options ).catch( ( err )=> {
    //
    //         Code.expect( err.err ).to.equal( 'close_error' );
    //         done()
    //
    //     } )
    // } );

} );