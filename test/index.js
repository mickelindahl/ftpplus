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
        this.resume = () => {
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
        list: ( path, done ) => {

            if ( auth.list_error ) {
                return done( 'list_error' )
            }
            if ( auth.no_files ) {
                return done( null, undefined )
            }
            done( null, Fs.readFileSync( __dirname + '/list_files.txt', 'binary' ) )

        },
        get: ( path, done ) => {

            if ( auth.get_error ) {
                return done( 'get_error' );
            }

            let my_socket = new MySocket();

            done( null, my_socket );

            let data = Fs.readFileSync( __dirname + '/data.xml', 'binary' );

            for ( let i = 0; i < data.length/10; i++ ) {

                my_socket.emit( 'data', data.slice( i*10, (i + 1)*10 ) )

            }

            if ( auth.close_error ) {
                return my_socket.emit( 'close', 'close_error' );
            }

            my_socket.emit( 'close', null )

        },

    }
}

//Mock( 'sftpjs', ftp );

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

//require( 'dotenv' ).config( { path: root + '/testenv' } );

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

    lab.test( 'list disk, filter visibale true, visible false, no filter, ' +
        'filter return nothing read from disk and parse', function ( done ) {
        var options = {

            type: 'disk',

        };

        let _tmp_files;

        let io = IO( options )
            .list( './test' )
            .filter( f => {

                return {
                    include: ['data.xml', 'index.js'].indexOf(f.name)!=-1,
                    visible: true
                }
            } )
            .then( results => {

                //debug(results)

                Code.expect( io.files_filtered.length ).to.equal( 2 );
                Code.expect( io.files_visible.length ).to.equal( 3 );

                return io.files_filtered

            })
            .filter()
            .then( results => {

                //debug(results)

                Code.expect( io.files_filtered.length ).to.equal( 2 );
                Code.expect( io.files_visible.length ).to.equal( 2 );

                return io.files_visible
            })
            .filter(f => {

                return {
                    include: f.name == 'data.xml',
                    visible: false
                }
            })
            .then( results => {

                //debug(results)

                Code.expect( io.files_filtered.length ).to.equal( 1 );
                Code.expect( io.files_visible.length ).to.equal( 1 );

                _tmp_files=JSON.parse(JSON.stringify(io.files_filtered));

                return io.files_visible
            })
            .filter(f => {

                return {
                    include: false,
                    visible: false
                }
            })
            .then( results => {

                //debug(results)

                Code.expect( io.files_filtered.length ).to.equal( 0 );
                Code.expect( io.files_visible.length ).to.equal( 0 );

                io.files_filtered=_tmp_files;
                io.files_visible=_tmp_files;

                return io.files_visible
            })
            .read( 'utf8' )
            .parse( d => {return Promise.resolve( d.text )} )
            .then( results => {

                //debug(results)

                Code.expect( io.data.length ).to.equal( 1 );

                //debug(io.data)
                //Code.expect( results.length ).to.equal( 6 );

                done()
            } )
    } );

    lab.test( 'list and read from sftp', function ( done ) {
        var options = {

            type: 'ftp',
            credentials:{

                host:'test.rebex.net',
                port:22,
                user:'demo',
                password:'password'
            }
        }

        let io = IO( options )
                .list( '.' )
                .filter( f => {

                    return {
                        include: ['readme.txt'].indexOf(f.name)!=-1,
                        visible: true
                    }
                })
                .read('utf8')
                .then(res=>{


                    debug(res)
                    done()

                })

        });

    lab.test( 'list sftp no existant direcotry', function ( done ) {
        var options = {

            type: 'ftp',
            credentials:{

                host:'test.rebex.net',
                port:22,
                user:'demo',
                password:'password'
            }
        }

        let io = IO( options )
            .list( './wrong' )
            .catch(err=>{

                debug(err)


                return [
                    {path:'./wrong.txt'},
                    {path:'/readme.txt'}
                ]
            })
            .read()
            .then(res=>{


                Code.expect( io.data.length ).to.equal( 2 );
                Code.expect( io.data[0].text ).to.equal( '' );
                Code.expect( io.data[1].text ).not.to.equal( '' );

                done()

            })

    });

    lab.test( 'unsupported type and trow error', function ( done ) {
        var options = {

            type: 'wrong'

        }

        let io = IO( options )
            .catch(err=>{

                Code.expect( err ).to.equal( 'Unsupported type import source type wrong' );

                done();

            })

    });


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