var
    fs = require('fs'),

    api = require('genius-api'), // https://www.npmjs.com/package/genius-api
    genius = new api('g_yLuZ1_YX8oJiX0DcLCI9pIc-DpsNrrxpPLCO8O6q7cTudOxQI_mfdkCX84qE8v'),

    request = require('request'),
    cheerio = require('cheerio'), // https://medium.com/sketch-app-sources/choosing-the-right-prototyping-tool-244a7f9ce7b1

    findFilesInDir = require('./findFilesInDir'), // http://stackoverflow.com/questions/25460574/find-files-by-extension-html-under-a-folder-in-nodejs
    // path2MP3 = "/Users/ichuyko/Music/iTunes/iTunes Media/Music/Magnit & Slider/Unknown Album/",
    // path2MP3 = '/Users/ichuyko/Music/iTunes/iTunes Media/Music/',
    path2MP3 = "/Users/ichuyko/Music/iTunes/iTunes Media/Music/Alan Walker/Sing Me to Sleep/",

    jsmediatags = require('jsmediatags'),     // https://www.npmjs.com/package/jsmediatags

    cp = require('child_process'),
    mm = require('musicmetadata'),
    ID3 = require('id3-parser'),
    mm2 = require('music-metadata'),
    util = require('util'),

    id3 = require('id3-writer'), // https://www.npmjs.com/package/id3-writer
    app_id = 'https://github.com/ichuyko/mp3fixer';


var args = process.argv;

let stat = {};

// getSongname("/Users/ichuyko/Music/iTunes/iTunes Media/Music/Alan Walker/Sing Me to Sleep/Sing Me to Sleep.mp3");

// if (1==4)
main();

function main() {
  if (args.length > 3)
    path2MP3 = args[2];

  let mp3Files = findFilesInDir(path2MP3, '.mp3');
  // console.log(mp3Files);
  if (mp3Files && mp3Files.length > 0)
    mp3Files.forEach(function(mp3File) {
      fixMP3(mp3File).then(function(result) {
        // console.log(result);
      }).catch(function(err) {
        // console.log(err);
      });
    });
}

function fixMP3(path2MP3){
  return new Promise(function(resolve, reject) {
    getSongname(path2MP3).then(function(songName) {
      getGeniusLyric(songName).then(function(lyrics) {
        writeLyrics(path2MP3, lyrics).then(function(res) {
          resolve(res);
        }).catch(function(err) {
          reject(err);
        });
      }).catch(function(err) {
        reject(err);
      });
    });
  });
}


function getSongname(path2MP3){
  return new Promise(function(resolve, reject) {

    var audioStream = fs.createReadStream(path2MP3)

// create a new music-metadata from a node ReadStream
    mm2.parseStream(audioStream, {native: true}, function (err, metadata) {
      // important note, the stream is not closed by default. To prevent leaks, you must close it yourself
      audioStream.close();
      if (err) throw err;

      console.log(util.inspect(metadata, {showHidden: false, depth: null}));
    });

    // let buffer = fs.readFileSync(path2MP3)
    // ID3.parse(buffer).then(tag => {
    //   console.log(tag);
    // });


    // var readableStream = fs.createReadStream(path2MP3);
    // var parser = mm(readableStream, function (err, metadata) {
    //   if (err) throw err;
    //
    //   readableStream.close();
    //
    //   console.log(metadata);
    // });

    jsmediatags.read(path2MP3, {
      onSuccess: function(tag) {
        // console.log(tag);

        if (tag.version != "2.2.0"){
          reject("Wring version: " + tag.version);
          return;
        }

        // 1.0
        // 1.1
        // 2.2.0
        // 2.3.0
        // 2.4.0

        let sv = stat[tag.version];
        if (!sv){
          stat[tag.version] = {};
          stat[tag.version].cnt = 1;
        } else {
          stat[tag.version].cnt = stat[tag.version].cnt + 1;
        }

        if (tag.tags && tag.tags.COMM){
          if (tag.tags.COMM['length']){
            console.log(tag.version + ' - ' + path2MP3);
            console.log('tag.tags.COMM.length = ' + tag.tags.COMM.length);
            console.log(tag.tags.COMM);
          }
        }

        if (tag.tags && tag.tags.USLT){
          if (tag.tags.USLT['length']){
            console.log(tag.version + ' - ' + path2MP3);
            console.log('tag.tags.USLT.length = ' + tag.tags.USLT.length);
          }
        }

        // if (tag.tags.lyrics && tag.tags.lyrics.lyrics){
        //   let lyrics = tag.tags.lyrics.lyrics;
        //   if (lyrics) {
        //     reject('Lyrics already exists - ' + path2MP3);
        //     return;
        //   }
        // }
        //
        // if (tag.tags.comment && tag.tags.comment.text) {
        //   let comment = tag.tags.comment.text;
        //   if (comment && comment.indexOf(app_id) != -1){
        //     reject('Already scanned - ' + path2MP3);//!!!
        //     return;
        //   }
        // }

        let search_song_name = tag.tags.artist;//.trim();

        if (!search_song_name)
          search_song_name = tag.tags.album;//.trim();

        if (tag.tags.title)
          search_song_name = search_song_name + ' - ' + tag.tags.title;//.trim();

        resolve(search_song_name);

      },
      onError: function(error) {
        console.log(':(', error.type, error.info);
      },
    });





  });
};

function getGeniusLyric(song_name){
  return new Promise(function(resolve, reject) {
    genius.search(song_name).then(function(response) {
      // console.log('hits', response.hits);
      if (response && response.hits && response.hits.length > 0){
        let geniusSearchItem = response.hits[0].result;
        console.log('Genius search result: ');
        // img = geniusSearchItem.header_image_url;
        console.log(geniusSearchItem);
        if (geniusSearchItem.url)
          loadLyrics(geniusSearchItem).then(function(lyrics) {
            resolve(lyrics);
          }).catch(function(err) {
            reject(err);
          });
        else
          reject('Lyrics not found');
      } else {
        console.log('Song not found: ' + song_name);
      }
    });
  });
}

function loadLyrics(geniusSearchItem) {
  return new Promise(function(resolve, reject) {
    request(geniusSearchItem.url, function (error, response, body) {
      if (!error) {
        let $ = cheerio.load(body);
        let lyrics = $('lyrics');
        // lyrics = lyrics.html();
        // lyrics = lyrics.text(;
        // console.log(lyrics.html());
        console.log('---------------[ Lyrics ]--------------------');
        if (lyrics) {
          lyrics = lyrics.text();
          lyrics = app_id + '\n\n' + geniusSearchItem.full_title + '\n\n' + lyrics;
          console.log(lyrics);
          resolve(lyrics);
        } else {
          console.log('Tag \'lyrics\' not found');
          reject('Tag \'lyrics\' not found');
        }
      } else {
        console.log('We’ve encountered an error: ' + error);
        reject(error);
      }
    });
  });
}


function writeLyrics(path2MP3, lyrics){
  return new Promise(function(resolve, reject) {
    console.log('Start writing...');
    let comment = app_id + ":" + "GeniusLyric" + ":eng"

    let ls = cp.spawnSync('id3v2', ['--comment', comment, '--USLT', lyrics, path2MP3], { encoding : 'utf8' });
    // console.log('ls: ' , ls);
    console.log('stdout here: \n' + ls.stdout);
    if (ls.status == 0)
      resolve();
    else
      reject();
  });
};


function onExit(args){
  console.log('================ ' + args + ' ===================');
  console.log('Uptime: ' + process.uptime());
  console.log(stat);
  process.exit(0);
}

process.on('exit', onExit);
process.on('SIGINT', onExit);
process.on('SIGTERM', onExit);

process.on('uncaughtException', (err) => {
  console.log(err);
});
