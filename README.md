# Assetto-Server-Leaderboard

This is a simple leaderboard plugin for assetto corsa multiplayer server.

## Installation
```
$ git clone https://github.com/sw08/assetto-server-leaderboard.git
$ ls assetto-server-leaderboard
$ npm i
```
You need the recent version of nodejs installed as well.

## Configuration
First, you have to edit `server_cfg.ini` to setup udp settings.
![Port example](/port_example.png)

The hostname and port #1 are the address which the plugin will be listening on, and the port #2 is where the server will be transmitting data.

You can change them to whatever you want, but don't set port #1 and #2 the same.
In this example, we'll use the data same as the image.

Then make a file named `config.json`, and locate it in the same folder as `app.js`.
config.json consists of 5 properties, which are: 
```json
{
    "SERVERDIR": ".../steamapps/common/assettocorsa/server",
    "DBDIR": "./data",
    "UDPPORT": 12001,
    "WEBPORT": 8080,
    "WEBTITLE": "Assetto Corsa Leaderboard"
}
```
* `SERVERDIR`: the directory where `acServer.exe` is located
* `DBDIR`: the directory where the records will be saved(they're separated by tracks)
* `UDPPORT`: the port #1 you set up above
* `WEBPORT`: the port the leaderboard web page will be hosted at
* `WEBTITLE`: the title which will be displayed at the top of the page

Also, you can override the car thumbnail image by inserting one in `./carImages` folder. Only one image can be used and the name must be same as the car folder name(ex. `ks_mazda_mx5_nd`). 
> Recommend images with horizontal/vertical ratio of 16:9

## Example

![Example Leaderboard](/example.png)

## Troubleshooting
If car name is displayed like `ks_mazda_mx5_nd`, not `Mazda MX5 ND`(for example), try editing the car's `/ui/ui_car.json` file to remove any line breaks in strings.

## License
This project is under the MIT License.
