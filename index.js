var
    fs = require('fs'),

    api = require('genius-api'), // https://www.npmjs.com/package/genius-api
    genius = new api("g_yLuZ1_YX8oJiX0DcLCI9pIc-DpsNrrxpPLCO8O6q7cTudOxQI_mfdkCX84qE8v"),

    request = require("request"),
    cheerio = require("cheerio"), // https://medium.com/sketch-app-sources/choosing-the-right-prototyping-tool-244a7f9ce7b1

    findFilesInDir = require('./findFilesInDir'), // http://stackoverflow.com/questions/25460574/find-files-by-extension-html-under-a-folder-in-nodejs
    path2MP3 = "/Users/ichuyko/Music/iTunes/iTunes Media/Music/Alan Walker",

    jsmediatags = require("jsmediatags"),     // https://www.npmjs.com/package/jsmediatags

    id3 = require('id3-writer'), // https://www.npmjs.com/package/id3-writer
    app_id = "https://github.com/ichuyko/mp3fixer";

var args = process.argv;

main();

function main() {
  if (args.length > 2)
    path2MP3 = args[2];

  let mp3Files = findFilesInDir(path2MP3, ".mp3");
  console.log(mp3Files);
  if (mp3Files && mp3Files.length > 0)
    mp3Files.forEach(function(mp3File) {
      fixMP3(mp3File).then(function(result) {
        console.log(result);
      }).catch(function(err) {
        console.log(err);
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

    jsmediatags.read(path2MP3, {
      onSuccess: function(tag) {



        console.log(tag);
        if (tag.tags.lyrics && tag.tags.lyrics.lyrics){
          let lyrics = tag.tags.lyrics.lyrics;
          if (lyrics) {
            reject("Lyrics already exists");
            return;
          }
        }

        if (tag.tags.comment && tag.tags.comment.text) {
          let comment = tag.tags.comment.text;
          if (comment && comment.indexOf(app_id) != -1){
            reject("Already scanner");//!!!
            return;
          }
        }

        let artist = tag.tags.artist;
        if (!artist)
          artist = tag.tags.album;

        resolve(artist + " - " + tag.tags.title);

      },
      onError: function(error) {
        console.log(':(', error.type, error.info);
      }
    });





  });
};

function writeLyrics(path2MP3, lyrics){
  return new Promise(function(resolve, reject) {
    console.log("Start writing...")

// Load and assign modules

    var writer = new id3.Writer();
    var file = new id3.File(path2MP3);
    var meta = new id3.Meta({
      comment: app_id
    });
    // var coverImage = new id3.Image(img);

    writer.setFile(file).write(meta, function(err) {
      if (err) reject(err);

      console.log("End writing.")
      resolve();
    });
    // }, [coverImage]);
  });
};

function getGeniusLyric(song_name){
  return new Promise(function(resolve, reject) {
    genius.search(song_name).then(function(response) {
      // console.log('hits', response.hits);
      if (response && response.hits && response.hits.length > 0){
        let geniusSearchItem = response.hits[0].result;
        console.log("Genius search result: ");
        // img = geniusSearchItem.header_image_url;
        console.log(geniusSearchItem);
        if (geniusSearchItem.url)
          getLyrics(geniusSearchItem).then(function(lyrics) {
            resolve(lyrics);
          }).catch(function(err) {
            reject(err)
          });
        else
          reject("Lyrics not found");
      } else {
        console.log("Song not found: " + song_name);
      }
    });
  });
}

function getLyrics(geniusSearchItem) {
  return new Promise(function(resolve, reject) {
    request(geniusSearchItem.url, function (error, response, body) {
      if (!error) {
        let $ = cheerio.load(body);
        let lyrics = $("lyrics");
        // lyrics = lyrics.html();
        // lyrics = lyrics.text(;
        // console.log(lyrics.html());
        console.log("---------------[ Lyrics ]--------------------");
        if (lyrics) {
          lyrics = lyrics.text();
          lyrics = app_id + "\n\n" + geniusSearchItem.full_title + "\n\n" + lyrics;
          console.log(lyrics);
          resolve(lyrics);
        } else {
          console.log("Tag 'lyrics' not found");
          reject("Tag 'lyrics' not found");
        }
      } else {
        console.log("We’ve encountered an error: " + error);
        reject(error);
      }
    });
  });
}

