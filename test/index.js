/**
 * Created by s057wl on 2016-07-14.
 */
'use strict';

const Code = require( 'code' );   // assertion library
const Lab = require( 'lab' );
const IO = require( '../index' );
const debug = require( 'debug' )( 'text_file_import:test:index.js' );
const Promise = require( 'bluebird' );

var lab = exports.lab = Lab.script();

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

                let bool =  ['data.xml', 'index.js'].indexOf( f.name ) != -1

                debug(bool, f)

                return bool

                //return {
                //    include: ['data.xml', 'index.js'].indexOf( f.name ) != -1,
                //    visible: true
                //}
            } )
            .then( results => {

                //console.log(results)
                debug(results)

                Code.expect( io.files_filtered.length ).to.equal( 2 );
                //Code.expect( io.files_visible.length ).to.equal( 5 );

                return io.files_filtered

            } )
            //.filter()
            //.then( results => {
            //
            //    //debug(results)
            //
            //    Code.expect( io.files_filtered.length ).to.equal( 2 );
            //    Code.expect( io.files_visible.length ).to.equal( 2 );
            //
            //    return io.files_visible
            //} )
            .filter( f => {

                return f.name == 'data.xml'

                //return {
                //    include: f.name == 'data.xml',
                //    visible: true
                //}
            } )
            .then( results => {

                debug(results);

                //Code.expect( io.files.length ).to.equal( 1 );
                Code.expect( io.files_filtered.length ).to.equal( 1 );
                //Code.expect( io.files_visible.length ).to.equal( 2 );

                _tmp_files = JSON.parse( JSON.stringify( io.files_filtered ) );

                return _tmp_files
            } )
            .filter( f => {

                return  false
                    //visible: false
                //}
            } )
            .then( results => {

                //debug(results)

                Code.expect( io.files_filtered.length ).to.equal( 0 );
                //Code.expect( io.files_visible.length ).to.equal( 0 );

                io.files_filtered = _tmp_files;
                //io.files_visible = _tmp_files;

                return _tmp_files
            } )
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
            credentials: {

                host: 'test.rebex.net',
                port: 22,
                user: 'demo',
                password: 'password'
            }
        }

        let io = IO( options )
            .list( '.' )
            .then( results => {

                            debug(results);

                            //Code.expect( io.files.length ).to.equal( 3 );

                            return results

                        } )
            .filter( f => {

                return  ['readme.txt'].indexOf( f.name ) != -1
            } )
            .read( 'utf8' )
            .then( res => {

                debug( res )
                done()

            } )

    } );

    lab.test( 'list sftp no existant direcotry', function ( done ) {
        var options = {

            type: 'ftp',
            credentials: {

                host: 'test.rebex.net',
                port: 22,
                user: 'demo',
                password: 'password'
            }
        }

        let io = IO( options )
            .list( './wrong' )
            .catch( err => {

                debug( err )

                return [
                    { path: './wrong.txt' },
                    { path: './readme.txt' }
                ]
            } )
            .read()
            .then( res => {

                Code.expect( io.data.length ).to.equal( 2 );
                Code.expect( io.data[0].text ).to.equal( '' );
                Code.expect( io.data[1].text ).not.to.equal( '' );

                done()

            } )

    } );


    lab.test( 'list sftp no existant direcotry', function ( done ) {
        var options = {

            type: 'ftp',
            credentials: {

                host: 'test.rebex.net',
                port: 22,
                user: 'demo',
                password: 'password'
            }
        }

        let io = IO( options )
            .then( err => {

                debug( err )

                return [
                    { path: './wroooong.txt' },
                ]
            } )
            .read()
            .then( res => {

                Code.expect( io.data.length ).to.equal( 1 );
                Code.expect( io.data[0].text ).to.equal( '' );

                done()

            } )

    } );

    lab.test( 'unsupported type and trow error', function ( done ) {
        var options = {

            type: 'wrong'

        }

        let io = IO( options )
            .catch( err => {

                Code.expect( err ).to.equal( 'Unsupported type import source type wrong' );

                done();

            } )

    } );

    lab.test( 'serialize', function ( done ) {
        var options = {

            type: 'disk',

        };

        let serialize = (d1,d2)=>{

            d1=d1.concat(d2);

            return d1

        };

        // let _tmp_files;

        let io = IO( options )
            .list( './test/full' )
            .list( './test/incremental' )
            .then( results => {

                debug(results);

                Code.expect( io.files.length ).to.equal( 3 );

                return results

            } )
            .read( 'utf8' )
            .then( results => {

                debug( results )
            })
            .parse( d => {return Promise.resolve( JSON.parse(d.text) )} )
            .then( results => {

                debug(results)

                // Code.expect( io.data.length ).to.equal( 7 );

                //debug(io.data)
                //Code.expect( results.length ).to.equal( 6 );

                // done()
            } )
            .serialize({name_full:'full.json', merge:serialize})
            .then( results => {

                debug(results);

                Code.expect( io.data.json.length ).to.equal( 6 );

                //debug(io.data)
                //Code.expect( results.length ).to.equal( 6 );

                done()
            } )
    } );

} );