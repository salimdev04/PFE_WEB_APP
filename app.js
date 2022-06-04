const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const server = require("http").createServer(app);

const { SerialPort, ReadlineParser } = require("serialport");
const { Server } = require("socket.io");
const io = new Server(server);

io.on('connection', socket => {
    console.log("new socket connection");
    socket.on('cmd', function (data) {
        console.log(data)
        port.write(data.status);
    })
})

let data_compteur;


app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

mongoose.connect("mongodb://localhost:27017/pfe_DB");

const compteursSchema = {
    _id: Number,
    user: {
        full_name: String,
        email: String,
        profession: String,
        telephone: String
    },
    compteur_state: String,
    daily_energies: [Number],
    month_energies: [Number],
    mode_consom: String,
    recharge: Number,
    abonnement: Number,
    tranche: Number,
    activation_date: Date
}

const Compteurs = mongoose.model("Compteurs", compteursSchema);


app.get("/", function (req, res) {
    Compteurs.find({}, function (err, data) {
        const act_cmpts = data.filter(cmpt => cmpt.compteur_state == "ACTIVE");
        const inact_cmpts = data.filter(cmpt => cmpt.compteur_state == "INACTIVE");

        res.render("home", { data, act_cmpts, inact_cmpts });
    });

})

app.get("/:id/compteur", function (req, res) {
    const id = req.params.id;

    Compteurs.findById(id, function (err, compteur) {
        io.on('connection', socket => {
            console.log("page connection");


            socket.emit('compteur_data', {
                value: compteur
            })
        })
        res.render("compteur", { compteur });
    })
})


const port = new SerialPort({
    path: '\\\\.\\COM4',
    baudRate: 9600,
});
const parser = port.pipe(new ReadlineParser({
    delimiter: '\r\n'
}))
parser.on('open', () => console.log('port COM open: '));

parser.on('data', (data) => {
    console.log('data: ', data.toString())
    io.emit('arduino:data', {
        value: data.toString()
    })
});

parser.on('data', (data) => {
    const cmd_data = data.toString().split(" ");
    console.log('data: ', cmd_data);

    switch (cmd_data[0]) {
        case "ID":
            Compteurs.findById(cmd_data[1], function (err, compteur) {
                data_compteur = compteur;
            });
            break;

        case "EE24":
            const daily_energies = data_compteur.daily_energies.reduce((a, b) => a + b, 0);
            let energy_d = (cmd_data[1] - daily_energies).toFixed(2)
            data_compteur.daily_energies.push(energy_d);

            break;

        case "EE30":
            const month_energies = data_compteur.daily_energies.reduce((a, b) => a + b, 0);
            let energy_m = (cmd_data[1] - month_energies).toFixed(2)
            data_compteur.month_energies.push(energy_m);
            //data_compteur.save();
            break;

        case "PP24":
            console.log("Prix data 24");
            break;
        case "PP30":
            console.log("Prix data 30");
            break;

        case "MODE":
            if (cmd_data[1] == 0) {
                //const mode = "ABONNEMENT";
                data_compteur.mode_consom = "ABONNEMENT";
                console.log(data_compteur.mode_consom);
            }
            else if (cmd_data[1] == 1) {
                //const mode = "RECHARGE";
                data_compteur.mode_consom = "RECHARGE";
                console.log(data_compteur.mode_consom);
            }
            //data_compteur.save();
            break;

        case "SECT":
            if (cmd_data[1] == 0) {
                //const mode = "INACTIVE";
                data_compteur.compteur_state = "INACTIVE";
                console.log(data_compteur.compteur_state);
            }
            else if (cmd_data[1] == 1) {
                //const mode = "ACTIVE";
                data_compteur.compteur_state = "ACTIVE";
                console.log(data_compteur.compteur_state);
            }
            //data_compteur.save();
            break;

        case "RECH":
            data_compteur.recharge = cmd_data[1];
            data_compteur.save();
            break;
        case "ABON":
            data_compteur.abonnement = parseInt(cmd_data[1]);
            //data_compteur.save();
            break;

        case "TRAN":
            data_compteur.tranche = parseInt(cmd_data[1]);
            //data_compteur.save();
            break;

        case "EE01":
            io.emit('arduino:data', {
                value: data.toString()
            })

        default:
            console.log("Code incorrect...");
            break;
    }

    data_compteur?.save();

})



server.listen(3000, function () {
    console.log("Server started on port 3000");
})