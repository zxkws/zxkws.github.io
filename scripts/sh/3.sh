#!/bin/bash
declare -a arr
url="https://unpkg.com/@surely-vue/table@4.3.13/dist/index.umd.js"
response=$(curl -s $url)
count=$((${#response}/15000))
for ((i=0;i<count;i++))
do
    start=$((i * 15000))
    end=$((start + 15000))
    segment="${response:$start:15000}"
    arr+=("$segment")
done
# while
# do
# count=${#url}
# echo ${#arr[@]}

# for item in "${arr[@]}"
# do
#     echo "$item"
# done

# for ((i=0;i<${#arr[@]};i++))
# do
#     sleep 1
#     echo "${arr[i]}"
# done

# i=0
# while [ $i -lt ${#arr[@]} ]
# do
#     sleep 1
#     echo "${arr[i]}"
#     i=$((i+1))
# done