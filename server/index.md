
https://github.com/v2ray/v2ray-core/releases

./v2ray -test -config ./config.json


./v2ray –config=./config.json


nohup ./v2ray –config=./config.json  >/dev/null 2>&1 &


curl -x socks5://127.0.0.1:10808 https://www.google.com

vim ~/.bashrc

# set proxy
function setproxy() {
    export http_proxy=socks5://127.0.0.1:10808
    export https_proxy=socks5://127.0.0.1:10808
    export ftp_proxy=socks5://127.0.0.1:10808
}
​
# unset proxy
function unsetproxy() {
    unset http_proxy https_proxy ftp_proxy
}

source ~/.bashrc

setproxy

curl  https://www.google.com