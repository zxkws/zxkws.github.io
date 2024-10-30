
import re


def check_ip(ip):
    ip_pattern = re.compile(r'^([0-9]{1,3}\.){3}[0-9]{1,3}$')

    if not ip_pattern.match(ip):
        return False
    
    parts = ip.split('.')

    for part in parts:
        if not 0<=int(part) <= 255:
            return False
        if len(part) > 1 and part[0] == '0':
            return False
        
    return True

ips = ["192.168.1.1", "256.256.256.256", "192.168.1", "192.168.1.01", "192.168.01.1"]

for ip in ips:
    if check_ip(ip):
        print(f"{ip} is valid")
    else:
        print(f"{ip} is not valid")