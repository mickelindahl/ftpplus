/**
 * Created by Mikael Lindahl (mikael) on 1/15/17.
 */

'use strict';

var Client = require('sftpjs');
var c = Client();

c.on('ready', function () {
    c.list('/opt/rsync/tips/pers',function (err, list) {
        if (err) throw err;
        console.dir(list);
        c.get('/opt/rsync/tips/pers/Turer.csv',function (err, file) {
            if (err) throw err;
            console.dir(file);

            c.end();
        })

    });
}).connect({
    host : ''
    , user : ''
    , password : ''
});