/**
 * Created by s057wl on 2016-07-14.
 */
'use strict';

const Code = require('code');   // assertion library
const Lab=require('lab');
const Path=require('path');
const Ftp = require('../index');
const debug=require('debug')('ftpplus:test');
const Parse=require('parse');

var lab = exports.lab = Lab.script();
var root = Path.resolve();

require('dotenv').config({path: root+'/testenv'});
var auth = {
    host: process.env.FTP_HOST,
    port: process.env.FTP_PORT,
    user: process.env.FTP_USER,
    pass: process.env.FTP_PASS
};

lab.experiment('parse', function () {

    lab.before({},function (done) {
        done();
    });

    // lab.test('fetch crew with parse', function (done) {
    //     var options={
    //         auth:auth,
    //         path:process.env.FTP_PATH_PERS,
    //         encoding:'binary',
    //         post_process:Parse.crews
    //     };
    //
    //     Ftp.fetch(options).then((results)=>{
    //
    //         Code.expect(results).to.be.an.array();
    //         done();
    //
    //     }).catch((err)=>{
    //         console.error(err);
    //         done()
    //     })
    // });
    //
    // lab.test('fetch loken', function (done) {
    //     var options={
    //         auth:auth,
    //         path:process.env.FTP_PATH_LOKEN,
    //         encoding:'binary'
    //     };
    //
    //     Ftp.fetch(options, function(err, results){
    //         if (err) {
    //             return console.log(err);
    //         }
    //         Code.expect(results).to.be.an.array();
    //         done();
    //     });
    // });
    //
    // lab.test('fetch train running', function (done) {
    //
    //     var options={
    //         auth:auth,
    //         path:process.env.FTP_PATH_TRRU,
    //         exclude: [
    //             'TrainRunningInformation_20160420-083401-524.xml',
    //             'TrainRunningInformation_20160420-083404-810.xml']
    //         };
    //
    //
    //     Ftp.fetch(options, function(err, results){
    //         if (err) {
    //             return console.log(err);
    //         }
    //         Code.expect(results).to.be.an.array();
    //         Code.expect(results.length).to.equal(77);
    //         done();
    //     });
    // });
    //
    // lab.test('fetch utin', function (done) {
    //
    //     var options={
    //         auth:auth,
    //         path:process.env.FTP_PATH_UTIN,
    //         limit:1,
    //         filter:['utin_test_data.xml'],
    //     };
    //
    //     Ftp.fetch(options, function(err, results){
    //         if (err) {
    //             return console.log(err);
    //         }
    //         Code.expect(results[0].json).to.equal(undefined);
    //         Code.expect(results).to.be.an.array();
    //         done();
    //     });
    // });

    lab.test('fetch utin with parse, skip and promise', function (done) {

        var options={
            auth:auth,
            path:process.env.FTP_PATH_UTIN,
            filter:['UtinTTResp20160420-001317-963', 'utin_test_data.xml'],
            post_process:Parse.timetable,
            skip: {
                fun: (str, options)=> {

                    if (str.indexOf('<MessageNumber>2392</MessageNumber>')!=-1) {
                        debug('skipping', str.indexOf('<MessageNumber>2392</MessageNumber>'))
                        return true
                    }

                    else return false

                },
                options:{}
            }
        };

        Ftp.fetch(options).then((results)=>{

            // debug(results[0].json.length)

            Code.expect(results.length).to.equal(2);
            Code.expect(results[0].json.length).to.equal(257);
            Code.expect(results).to.be.an.array();
            done();

        }).catch((err)=>{
            console.error(err);
            done()
        })
    });

});