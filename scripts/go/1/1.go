package main

import (
	"fmt"
	"net"
	"regexp"
)

func checkIp(ip string) bool {
	re := regexp.MustCompile(`^([0-9]{1,3}\.){3}[0-9]{1,3}$`)
	if !re.MatchString(ip) {
		return false
	}
	parsedIp := net.ParseIP(ip)
	if parsedIp == nil {
		return false
	}

	parts := re.FindStringSubmatch(ip)
	for _, part := range parts[1:] {
		if len(part) > 0 && (part[0] == '0' && len(part) > 1) {
			return false
		}
	}
	return true
}

func main() {
	ips := []string{"192.168.1.1", "256.256.256.256", "192.168.1", "192.168.1.01"}
	for _, ip := range ips {
		if checkIp(ip) {
			fmt.Printf("%s is valid Ip\n", ip)
		} else {
			fmt.Printf("%s is not valid Ip\n", ip)
		}
	}
}
