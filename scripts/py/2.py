import datetime
import glob
import os
import subprocess


now = datetime.datetime.now()
logfile = f"/tmp/{now.strftime('%H-%Y-%m-%d')}.log"

current_hour = now.hour
if current_hour == 0 or current_hour == 12:
    for file_path in glob.glob('/data/log/*'):
        if os.path.isfile(file_path):
            open(file_path, 'w').close()
else:
    for file_path in glob.glob('/data/log/*'):
        result = subprocess.run(['du','-sh', file_path], capture_output=True, text=True)
        with open(logfile, 'a') as f:
            f.write(result.stdout)