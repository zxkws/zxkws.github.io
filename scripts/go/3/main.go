package main

import (
	"bytes"
	"fmt"
	"io/ioutil"
	"math"
	"net/http"
	"time"
)


func post(url string){
	postBody := []byte(`{"a":"123"}`)
	// jsonData := `{"name":"John", "age":30}`
	// data := []byte(jsonData)

	contentType := "application/json"
	resp, err := http.Post(url, contentType, bytes.NewBuffer(postBody))
	if err != nil{
		fmt.Println(err)
		return
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil{
		fmt.Println(err)
		return
	}
	fmt.Println(string(body))
}

func request(){
	client := &http.Client{
		Timeout: time.Second * 10,
	}

	req, err := http.NewRequest("GET", "http://www.example.com", nil)
	if err != nil{
		fmt.Println(err)
		return
	}
	resp, err:= client.Do(req)
	if err != nil {
		fmt.Println(err)
		return
	}
	defer resp.Body.Close()

	body, err:= ioutil.ReadAll(req.Body)
	if err != nil {
		fmt.Println(err)
		return
	}

	fmt.Println(string(body))
}


func main(){
	reqUrl := "https://unpkg.com/@surely-vue/table@4.3.13/dist/index.umd.js"
	resp,err := http.Get(reqUrl)
	if err != nil {
		fmt.Println(err)
		return
	}

	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		fmt.Println(err)
		return
	}
	res:=string(body)
	length := len(res)
	myNumber := float64(length) / 15000
	count := int(math.Floor(myNumber))
	
	// for i:=0; i < count; i++ {
	// 	fmt.Println(i)
	// }

	// for i:= range make([]int, count) {
	// 	fmt.Println(i)
	// }

	slice := make([]string, count)

	for i:=0; i < count;i++ {
		start := i * 5000
        end := (i + 1) * 5000
		slice[i] = res[start:end]
		time.Sleep(1*time.Second)
		fmt.Println(slice[i])
	}

}
