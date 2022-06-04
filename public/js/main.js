const socket = io();
 

  var ctx = document.getElementById("graphic").getContext("2d");
  var chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Consommation d'energie par jours",
          borderColor: "rgb(41, 128, 185)",
          data: [],
        },
      ],
    },
    options: {},
  });

   socket.on("compteur_data", function (data) {
     const daily_energies = data.value.daily_energies;
     let days = []
     for (let i = 0; i < daily_energies.length; i++) {
        days.push(i)
     }

     chart.data.labels = days;
     chart.data.datasets[0].data = daily_energies;
     chart.update();
  });

  let counter = 0;
  socket.on("arduino:data", function (dataSerial) {
    document.getElementById('actuelEnergy').innerHTML = dataSerial.value;
  });

  function onReset() {
    console.log("reset");
    socket.emit("cmd", { status: "AA12 C5" });
  }

  var setSecteur = false;

  function onSecteur() {
    console.log("onSecteur");
    socket.emit("cmd", { status: "AA12 C2" });
    if (setSecteur) {
      document.getElementById("secteur").innerHTML = "DESACTIVER SECTEUR";
      setSecteur = false;
    } else {
      document.getElementById("secteur").innerHTML = "ACTIVER SECTEUR";
      setSecteur = true;
    }
  }

  function onChangeMode() {
    socket.emit("cmd", { status: "AA12 C1" });
    console.log("mode change");
  }

  function onRecharge() {
    const rechageValue = document.getElementById('rechargeValue').value
    socket.emit("cmd", { status: `AA12 C4 ${rechageValue}` });
    console.log("onRecharge ", rechageValue);
    document.getElementById('rechargeValue').value = '';
  }
  function onDebug() {
    console.log("Debugage");
    socket.emit("cmd", { status: "AA12 D0" });
  }