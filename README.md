# OSA IPFS service

# Setup on EC2
Minimum requirement is T2 small. This walkthrough is for Amazon linux instances.

1. SSH into your fresh new system. As you are on Amazon linux, the default user is `ec2-user`
1. `sudo sysctl -w net.core.rmem_max=2500000` increase buffer size for ipfs
1. `sudo nano /etc/sysctl.conf` add the line: `net.core.rmem_max=2500000` ctrl+o, enter, ctrl+x to write file and exit
1. `export CLUSTER_SECRET=<in accounts doc, Alkalmazások tab>` this secret is shared between all collaborating nodes in the cluster
1. `export API_PASSWORD=<in accounts doc, Alkalmazások tab>` this password is SPECIFIC to the node maintained by code and soda. All collaborating nodes in the cluster should have different passwords
1. `sudo amazon-linux-extras install -y nginx1` install nginx
1. `sudo nano /etc/nginx/nginx.conf` edit the nginx config file
1. add the following in the `server` block after the `root` directive

```
client_max_body_size 100M;

        location / {
                proxy_http_version 1.1;
                proxy_cache_bypass $http_upgrade;

                proxy_set_header Upgrade $http_upgrade;
                proxy_set_header Connection 'upgrade';
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $scheme;

                proxy_pass http://localhost:5000;
        }
```

8. ctrl+o, enter, then ctrl+x to save and exit
8. `sudo systemctl enable nginx`
8. `sudo systemctl start nginx`
8. `curl https://raw.githubusercontent.com/creationix/nvm/master/install.sh | bash` install nvm. read the instructions printed by this command on how to use nvm now, without restarting your terminal
8. `nvm install 16.14.0`
8. `npm install pm2@latest -g`
8. `pm2 startup` read the generated instructions on how to make pm2 start automatically on system restart and then issue the generated command
8. `mkdir node-app && cd node-app`
8. copy `package.json` and `index.js` from the `app` folder in this repository to the newly created folder on the instance
8. still in the `node-app` folder on the instance run `npm install`
8. `pm2 start index.js --name node-app --time`
8. `cd ..`
8. `wget https://dist.ipfs.io/go-ipfs/v0.11.0/go-ipfs_v0.11.0_linux-amd64.tar.gz`
8. `tar -xvzf go-ipfs_v0.11.0_linux-amd64.tar.gz`
8. `cd go-ipfs`
8. `sudo bash install.sh`
8. `cd ..`
8. `ipfs init --profile server` this will likely throw an error like `Failed to enqueue cid: leveldb: closed` Just ignore it
8. `pm2 start ipfs --name ipfs-daemon --time -- daemon`
8. `wget https://dist.ipfs.io/ipfs-cluster-service/v0.14.5/ipfs-cluster-service_v0.14.5_linux-amd64.tar.gz`
8. `tar -xvzf ipfs-cluster-service_v0.14.5_linux-amd64.tar.gz`
8. `cd ipfs-cluster-service/`
8. `./ipfs-cluster-service init`
8. `pm2 start ./ipfs-cluster-service -- daemon`
8. `pm2 install pm2-logrotate`
8. `pm2 set pm2-logrotate:compress true`
8. `pm2 save`
8. `cd ..`
8. `rm *.tar.gz` clean up

You are done. Good Job. You can check if everything is ok with `pm2 status` and `pm2 logs` Contact balazs.buri@codeandsoda.com if in despair


## Ports
The following ports are used and need to be open

+ 80 : API
+ 4001 : IPFS swarm
+ 9096 : Cluster IPFS Proxy endpoint



# Usage
Access the api via http, port 80. All requests except `/hello` must contain an `Authorization` header containing the `API_PASSWORD`. Otherwise the response JSON is
``` JSON
    {
        "error": "Unauthorized"
    }
```
with status 401

`GET /hello` Responds with a simple json

`GET /`
Some info about the running cluster

`POST /add`

Request should be of `multipart/form-data` type. The form should contain the field `file` containing the file to add to ipfs.

Responds with JSON
``` JSON
{
    "CID": "<The generated content id>"
}
```
If something goes wrong the response will be JSON
``` JSON
{
    "error": "Server Error"
}
``` 
with status 500


