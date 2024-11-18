import time
import requests
import math

reqUrl="https://unpkg.com/@surely-vue/table@4.3.13/dist/index.umd.js"

res = requests.get(reqUrl).text

length = len(res)

count = math.floor(length/15000)

my_list=[]

for i in range(count):
    my_list.append(res[i*15000:(i+1)*15000])
    time.sleep(1)
    print(my_list[i])
