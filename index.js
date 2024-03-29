const express = require('express');
const cors = require('cors');
const fs = require('fs');
const helmet = require("helmet");
const path = require('path');
const mysql = require('mysql');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const https = require('https');
const app = express();
const server = https.createServer(app);
const { Server } = require("socket.io");
const crypto = require("crypto");
// const host = 'self';
const host = 'cloud';
let chat_url = 'https://g4o2.idx.tw';
let con = mysql.createConnection({
    host: 'localhost',
    user: 'g4o2',
    database: 'g4o2',
    password: process.env.DB_PASS
});

const options = {
    key: fs.readFileSync('ssl/private-key.pem'),
    cert: fs.readFileSync('ssl/certificate.pem')
};

const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minute window
    max: 20, // limit each IP to 20 requests per windowMs,
    expire: 1000 * 60 * 60,
    message: 'Rate limit exceeded (20 images per 10 minutes)'
});

if (host === 'self') {
    con = mysql.createConnection({
        host: 'localhost',
        user: 'g4o2',
        database: 'sql12561191',
        password: 'g4o2'
    });
    chat_url = 'http://localhost';
}

const io = new Server(server, {
    cors: {
        origin: [chat_url]
    }
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './uploads');
    },
    filename: (req, file, cb) => {
        const fileName = file.fieldname + '-' + Date.now() + path.extname(file.originalname);
        cb(null, fileName);
        return fileName;
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 5 }
});

const pfpstorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './pfp');
    },
    filename: (req, file, cb) => {
        const fileName = file.fieldname + '-' + Date.now() + path.extname(file.originalname);
        cb(null, fileName);
        return fileName;
    }
});

const pfpupload = multer({
    storage: pfpstorage,
    limits: { fileSize: 1024 * 1024 * 5 }
});

app.use(cors({
    origin: chat_url
}));

// app.use(helmet());

app.get('/uploads/:filename', (req, res) => {
    const filename = req.params.filename;
    res.sendFile(filename, { root: './uploads' }, (err) => {
        if (err) {
            console.error(err);
            // res.status(404).send('File not found');
            res.redirect("https://http.cat/404");
        }
    });
});

app.post('/upload-image', limiter, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No image uploaded.');
    }
    const filename = req.file.filename;
    data = {
        filename
    }
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(data, null, 3));
});

app.get('/pfp/:filename', (req, res) => {
    const filename = req.params.filename;
    res.sendFile(filename, { root: './pfp' }, (err) => {
        if (err) {
            console.error(err);
            // res.status(404).send('File not found');
            res.redirect("https://http.cat/404");
        }
    });
});

app.post('/pfp', limiter, pfpupload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No image uploaded.');
    }
    const filename = req.file.filename;
    data = {
        filename
    }
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(data, null, 3));
});

app.get('/', (req, res) => {
    data = [
        { message: "Welcome to the g4o2-chat api and socket.io server" },
        {
            directories: [
                "/db"
            ]
        }
    ];
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(data, null, 3));
});

app.get('/db', (req, res) => {
    data = [
        {
            directories: [
                "/db/users",
                "/db/messages",
                "/db/chatlog"
            ]
        }
    ]
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(data, null, 3));
})

app.get('/db/users', (req, res) => {
    var sql = 'SELECT * FROM account;';
    con.query(sql, function (err, responce) {
        if (err) {
            throw err;
        } else if (!responce.length) {
            let responce = "no rows returned";
            data = {
                responce
            }
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify(data, null, 3));
            return console.log(responce);
        }
        data = {
            responce
        };
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(data, null, 3));
    })
});

app.get('/db/users/:userId', (req, res) => {
    let user_id = req.params.userId;
    var sql = 'SELECT * FROM account WHERE user_id=?';
    con.query(sql, [user_id], function (err, responce) {
        if (err) {
            throw err;
        } else if (!responce.length) {
            let responce = "no rows returned";
            data = {
                responce
            }
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify(data, null, 3));
            return console.log(responce);
        }
        let email;
        if (responce[0]['show_email'] !== "True") {
            email = "Hidden";
        } else {
            email = responce[0]['email']
        }
        data = {
            user_id: responce[0]['user_id'],
            username: responce[0]['username'],
            name: responce[0]['name'],
            email: email,
            about: responce[0]['about'],
            pfp: responce[0]['pfp']
        };
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(data, null, 3));
    });
});

app.get('/db/messages', (req, res) => {
    var sql = 'SELECT * FROM chatlog INNER JOIN account on chatlog.user_id = account.user_id; ';
    con.query(sql, function (err, responce) {
        if (err) {
            throw err;
        } else if (!responce.length) {
            let responce = "no rows returned";
            data = {
                responce
            }
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify(data, null, 3));
            return console.log(responce);
        }
        data = {
            responce
        };
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(data, null, 3));
    });
});

app.get('/db/messages/:messageId', (req, res) => {
    // let message_id = req.query.id;
    let message_id = req.params.messageId;
    var sql = 'SELECT * FROM chatlog WHERE message_id=?';
    con.query(sql, [message_id], function (err, responce) {
        if (err) throw err;
        data = {
            "message_id": responce[0]['message_id'],
            "message": responce[0]['message'],
            "message_date": responce[0]['message_date'],
            "account": responce[0]['account'],
            "user_id": responce[0]['user_id']
        };
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(data, null, 3));
    });
});

app.get('/db/msgll', (req, res) => {
    let start = parseInt(req.query.start);
    if (!start) {
        data = {
            err: "Missing start parameter"
        }
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(data, null, 3));
    } else {
        start -= 1;
        var sql = 'SELECT * FROM chatlog INNER JOIN account ON chatlog.user_id = account.user_id ORDER BY message_id ASC LIMIT ?, 20';
        con.query(sql, [start], function (err, responce) {
            if (err) throw err;
            data = {
                responce
            };
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify(data, null, 3));
        });
    }
})

app.get('/send', (req, res) => {
    let message = req.query.message;
    let message_date = new Date().toUTCString();
    let usr = req.query.usr;
    let pw = req.query.pw;
    let user_id = 0;

    if(message === undefined || usr === undefined || pw === undefined) {
        data = {
            usage: "/send?message=<message>&usr=<username>&pw=<password>"
        }
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(data, null, 3));
    } else {

        const salt = process.env.SALT;
    const hash = crypto.createHash("md5").update(salt + pw).digest("hex");

    var sql = 'SELECT password, user_id FROM account WHERE username=?';
    con.query(sql, [usr], function (err, responce) {
        if (err) {
            throw err;
        }
        temp = responce[0]['password']
        user_id = responce[0]['user_id']

        if (hash === temp) {
            var sql = 'INSERT INTO chatlog (message, message_date, user_id) VALUES(?, ?, ?)';
            con.query(sql, [message, message_date, user_id], function (err, responce) {
                if (err) {
                    throw err;
                }
            });

            var sqlt = 'SELECT * FROM chatlog INNER JOIN account ON chatlog.user_id = account.user_id ORDER BY message_id DESC LIMIT 1;';
            con.query(sqlt, function (err, responce) {
                if (err) {
                    throw err;
                } else if (!responce.length) {
                    console.log("no rows returned");
                }
                console.log(responce);
                data = {
                    success: "message submitted",
                    responce
                }
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify(data, null, 3));
            });
        } else {
            responce = {
                err: "wrong password"
            }
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify(responce, null, 3));
        }
    });
}
})

io.on('connection', (socket) => {
    const userTokens = new Map();
    const msg_limit = 25;

    socket.on('user-connect', (user_id) => {
        console.log(`User id ${user_id} connected`);
        io.emit('user-connect', user_id);

        userTokens.set(user_id, msg_limit);
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });

    socket.on('message-submit', (messageDetails) => {
        const user_id = messageDetails['user_id'];

        if (userTokens.get(user_id) > 0) {
            userTokens.set(user_id, userTokens.get(user_id) - 1);

            var sql = 'INSERT INTO chatlog (message, message_date, user_id) VALUES(?, ?, ?)';
            con.query(sql, [messageDetails['message'], messageDetails['message_date'], messageDetails['user_id']], function (err, responce) {
                if (err) {
                    throw err;
                }
            });

            var sqlt = 'SELECT * FROM chatlog INNER JOIN account ON chatlog.user_id = account.user_id ORDER BY message_id DESC LIMIT 1;';
            con.query(sqlt, function (err, responce) {
                if (err) {
                    throw err;
                } else if (!responce.length) {
                    console.log("no rows returned");
                }
                io.emit('message-submit', responce[0]);
                console.log(responce);
            });
        } else {
            // const errorMessage = `User id ${user_id} has exceeded the rate limit`;
            const error = 429;
            socket.emit('message-error', error);
        }
    });

    socket.on('image-submit', (messageDetails) => {
        const user_id = messageDetails['user_id'];

        if (userTokens.get(user_id) > 0) {
            userTokens.set(user_id, userTokens.get(user_id) - 1);

            var sql = 'INSERT INTO chatlog (message, message_date, user_id) VALUES(?, ?, ?)';
            con.query(sql, [messageDetails['message'], messageDetails['message_date'], messageDetails['user_id']], function (err, responce) {
                if (err) {
                    throw err;
                }
            });

            var sqlt = 'SELECT * FROM chatlog INNER JOIN account ON chatlog.user_id = account.user_id ORDER BY message_id DESC LIMIT 1;';
            con.query(sqlt, function (err, responce) {
                if (err) {
                    throw err;
                } else if (!responce.length) {
                    console.log("no rows returned");
                }
                io.emit('image-submit', responce[0]);
                console.log(responce);
            });
        } else {
            // const errorMessage = `User id ${user_id} has exceeded the rate limit`;
            const error = 429;
            socket.emit('message-error', error);
        }
    });

    socket.on('load-message', (index) => {
        var sql = 'SELECT * FROM chatlog INNER JOIN account ON chatlog.user_id = account.user_id ORDER BY message_id DESC LIMIT ?, 25';
        con.query(sql, [index -= 1], function (err, responce) {
            if (err) {
                throw err;
            } else if (!responce.length) {
                console.log("no rows returned");
            }
            socket.emit('load-message', (responce))
        });
    })

    setInterval(() => {
        userTokens.forEach((value, key) => {
            userTokens.set(key, msg_limit);
        });
    }, 60 * 1000);
})


server.listen(4000, () => {
    console.log('listening on *:4000');
}); 