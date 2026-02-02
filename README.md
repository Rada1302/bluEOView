# Marine Plankton Diversity Bioindicator Scenarios for Policy MAKERs

This web application provides interactive visualizations of marine plankton diversity using a Flask backend with a React-based frontend. The application includes a globe visualization, a flat map, a line plot for trends, and various filters for indices, plankton groups, climate scenarios, and models.

## Table of Contents

- [Features](#features)
- [Components](#components)
- [Installation](#installation)
- [Server Configuration](#server-configuration)
- [Deployment](#deployment)
- [Firewall Configuration](#firewall-configuration)
- [Usage](#usage)
- [License](#license)

## Features

- **Filters and Modal Components**: Adjust data displayed by changing indices, plankton groups, climate scenarios, earth system models, and environmental parameters.
- **Time Slider**: View data for any year from 2012 to 2100.
- **Flat Map Visualization**: View geographical data on a flat 2D map.
- **Interactive Globe Display**: Visualize marine plankton diversity on a 3D globe.
- **Line Plot**: Display trends over time for a selected point or region.
<!-- - **Region Selection**: Toggle between point or region selection for the line plot. -->

## Components

### 1. **Filters and Modal Components**
- Displays explanatory text and information related to the selected index, plankton group, or model.
- Controlled by various buttons on the interface.

### 2. **Slider Component**
- Allows users to adjust the year of the displayed data dynamically.
- The globe, map, and line plot update accordingly.

### 3. **MapDisplay Component**
- Provides a 2D flat map view of the data using `react-plotly.js`.
- Data is color-coded, and the color scale can be customized for positive and negative values.
- Supports point or region selection for generating line plots.

### 4. **GlobeDisplay Component**
- Displays marine plankton data on a 3D globe.
- Data is fetched for the selected year and displayed with color-coded markers.
- Uses `react-globe.gl` and `d3-scale` for the color scale.
- Supports interaction like zooming, rotating, and clicking on points.


## Installation

### Prerequisites

- A Linux-based server (e.g., Ubuntu) with `Python 3.9+`
- `Nginx` as the reverse proxy server
- `Gunicorn` as the WSGI server for running Flask
- `Certbot` for managing HTTPS certificates via Let's Encrypt
- Shorewall for firewall management

### Step-by-Step Installation

1. **SSH into the Server:**\
   `ssh username@servername`
2. **Update the System:**\
   `sudo dnf update`\
   `sudo dnf upgrade`
3. **Install Dependencies** Install Python 3, pip, and venv:\
   `sudo dnf install python3-pip python3-virtualenv nginx git`
4. **Clone this Application**
   Navigate to a chosen directory <directory>:\
   
   `git clone <your-repository-url>`
6. **Create a Python Virtual Environment and Install Dependencies**\
   `cd mapmaker_js/backend`\
   `python3 -m venv mapmaker_env`\
   `source mapmaker_env/bin/activate`\
   `pip install -r requirements.txt`

   `cd mapmaker_js/frontend`\
   `curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -`\
   `sudo dnf install -y nodejs`\
   `npm install`

7. **Test locally:**\
   run `python app.py` on the backend directory
   and `npm start` on the frontend directory

8. **Set Up Gunicorn:** Create a Gunicorn service file:\
   `pip install gunicorn`\
   `sudo vim /etc/systemd/system/mapmaker_backend.service`\
   Add the following:\
   ```
   [Unit]
   Description=Gunicorn instance to serve mapmaker-new
   After=network.target

   [Service]
   User=<username>
   Group=<group><group>
   WorkingDirectory=<directory>/mapmaker_js/backend
   Environment="PATH=<directory>/mapmaker_js/backend/mapmaker_env/bin"
   ExecStart=<directory>/mapmaker_js/backend/mapmaker_env/bin/gunicorn --workers 3 --bind unix:<directory>/mapmaker/mapmaker.sock  -m 007 --timeout 120 app:app

   [Install]
   WantedBy=multi-user.target
   ```

   Set ownership of the socket and directory:

   `sudo chown <username>:<group> <directory>/mapmaker_js/backend/mapmaker_backend.sock`\
   `sudo chmod 770 <directory>/mapmaker_js/backend/mapmaker_backend.sock`\
   `sudo chown <username>:<group> <directory>/mapmaker_js/backend`\
   `sudo chmod 755 <directory>/mapmaker_js/backend`

9. **Start and Enable Gunicorn:**\
   `sudo systemctl start mapmaker_backend`\
   `sudo systemctl enable mapmaker_backend`

10. **Build the React Application:**

   Before deploying, you need to build the frontend (React) application. From the frontend directory, run the following commands:

   `cd mapmaker_js/frontend`\
   `npm install`\
   `npm run build`

   `sudo mkdir -p <directory>/`\
   `mapmaker_js/frontend_build`\
   `sudo cp -r build/* <directory>/mapmaker_js/frontend_build/`

   Make sure the user and group match with those in mapmaker_backend.service

11. **Install and Configure Nginx:**\
    `sudo dnf install nginx`\
    `sudo vim /etc/nginx/sites-available/mapmaker``\
    Add the following:

   ```
      server {
      listen 80;
      server_name <servername>;

      location /mapmaker/static/ {
         alias <directory>/mapmaker_js/frontend_build/static/;
         expires 1y;
         access_log off;
         add_header Cache_Control "public";
      }

      #Serve the React app for all other routes (single-page application behaviour)
      location / {
         root <directory>/mapmaker_js/frontend_build;
         try_files $uri /index.html
      }

      # Proxy API requests to the backend (Flask)
      location /api {
         include proxy_params;
         proxy_pass http://unix:<directory>/mapmaker_js/backend/mapmaker_backend.sock;
         }
      }
   ```

11. **Enable the site:**\
   `sudo ln -s /etc/nginx/sites-available/mapmaker /etc/nginx/sites-enabled/`\
   `sudo nginx -t`\
   `sudo systemctl restart nginx`

   In case sites-available/ and sites-enabled/ do not exist, you can create them

   `sudo mkdir -p /etc/nginx/sites-available`

   Make sure proxy_params exists or create it
   'sudo vim /etc/nginx/proxy_params`\

   Write the following configuration:
   ```
   proxy_set_header Host $host;
   proxy_set_header X-Real-IP $remote_addr;
   proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
   proxy_set_header X-Forwarded-Proto $scheme;
   ```

12. **Update nginx.conf (if necessary):**

At the top set the user as in the mapmaker_backend.service\
`user <username>;`

In the http block you can add the following:
`include /etc/nginx/sites-enabled/*;

Near the end of the http block you can also add:\
`keep_alive_timeout 65;`\
`client_max_body_size 100M;`\
`proxy_buffer_size 128k;`\
`proxy_buffers 4 256k;`\
`proxy_busy_buffers_size 256k;`\
`proxy_max_temp_files_size 0;`

13. **Set Up HTTPS with Certbot:** Install Certbot and the Nginx plugin:\
`sudo apt install certbot python3-certbot-nginx`\
`sudo certbot --nginx -d mapmaker-new`

## Firewall Configuration

### Using Shorewall

To configure the firewall using Shorewall, follow these steps to manage access to the web server.

#### Edit Shorewall Rules
You need to edit the `/etc/shorewall/rules` file to modify access settings:

`sudo nano /etc/shorewall/rules`

#### Allow Access from a Specific IP
To allow access from a specific IP address (replace xxx.xxx.xxx.xxx with the actual IP), add the following rule:\
`ACCEPT net:xxx.xxx.xxx.xxx fw tcp 80,443`

#### Reload the Firewall

`sudo systemctl reload shorewall`

#### Full Webserver Access

`ACCEPT net fw tcp 80,443`\
`sudo systemctl reload shorewall`
