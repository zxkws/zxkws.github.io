function checkIp(ip){
    if(ip && /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/.test(ip) && ip.split('.').every(item => item <= 255)){
        return true
    }
    return false
}

console.log(checkIp('192.168.1.1'));

console.log(checkIp('192.168.333'));
