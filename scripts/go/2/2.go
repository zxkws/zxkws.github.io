package main

import (
	"fmt"
	"io/ioutil"
	"os"
	"os/exec"
	"path/filepath"
	"time"
)


func main(){
	now := time.Now()
	logfile := fmt.Sprintf("/tmp/%02d-%d-%02d-%02d.log", now.Hour(), now.Year(), now.Month(), now.Day())
	curentHour := now.Hour()
	if curentHour == 0 || curentHour == 12 {
		files, err := filepath.Glob("/data/log/*")
		if err != nil {
			fmt.Println("Error", err)
			return
		}
		for _, file := range files {
			info, err := os.Stat(file)
			if err != nil {
				fmt.Println("Error", err)
				continue
			}
			if !info.IsDir() {
				err = ioutil.WriteFile(file, []byte{}, 0644)
				if err != nil {
					fmt.Println("error", err)
				}
			}
		}
	} else {
		files, err := filepath.Glob("/data/log/*")
		if err != nil {
			fmt.Println("error", err)
			return
		}

		for _, file := range files {
			info, err := os.Stat(file)
			if err != nil {
				fmt.Println("error", err)
				continue
			}
			if !info.IsDir() {
				cmd := exec.Command("du", "-sh", file)
				output, err:= cmd.Output()
				if err != nil {
					fmt.Println("error", err)
					continue
				}
				f, err := os.OpenFile(logfile, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
				if err != nil {
					fmt.Println(err)
					continue
				}
				_,err = f.Write(output)
				if err != nil {
					fmt.Println(err)
				}
				f.Close()
			}
		}
	}
	
}