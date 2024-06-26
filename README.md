# Salesblink Server Setup

This guide provides instructions for setting up the server for the Salesblink application.

### Link - https://salesblink-nvt1.onrender.com/

## Installation

1. Navigate to the `server` folder.
2. Clone the server repository:
    ```bash
    git clone -b server https://github.com/SwastikKasera/salesblink.git
    ```
3. Install the dependencies by running:
    ```bash
    npm install
    ```

## Environment Variables

Create a `.env` file in the `server` folder with the following example configuration:

```
PORT=4000
MONGODB_URI=
MAILGUN_SMTP_HOST=
MAILGUN_DOMAIN=
MAILGUN_API_KEY=
MAILGUN_USERNAME=
MAILGUN_PASS=
```

Fill in the values for your MongoDB URI and Mailgun credentials.

## Running the Server

To start the server, use one of the following commands:

```bash
npm start
```

or

```bash
node server.js
```

---

This section of the README provides a clear setup guide for the Salesblink server, ensuring users can easily get the server up and running.
