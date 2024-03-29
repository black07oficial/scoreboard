const { app, BrowserWindow, ipcMain, screen, dialog } = require('electron');
const sqlite = require('sqlite3').verbose();
const nodemailer = require('nodemailer');
const serialNumber = require('serial-number');
let configMonitor;
let configSerial;
const path = require('path');
const url = require('url');
const fs = require('fs-extra');
const moment = require('moment');
const crypto = require('crypto');
var isDebug = false;
var activeReload = false;

// Inclua esta linha para adicionar a funcionalidade de recarga automática.
if (isDebug && activeReload) {

  // require('electron-reload')(__dirname, {
  //   electron: path.join(__dirname, 'node_modules', '.bin', 'electron'),
  // });

}

let firstWindow;
let secondWindow;
let thirdWindow;
let fourthWindow;
let fifthWindow;
let janelas = [];
let numero_serial = '';
serialNumber.preferUUID = true;
serialNumber(async function (err, value) {
  numero_serial = value;
  db = new sqlite.Database('scoreboard.sqlite');
  try {
    rows_security = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM config_serial", (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
    configSerial = rows_security[0];
  } catch (error) {
    console.error(error.message);
  }
  if (configSerial.serial == null) {
    db.run(`UPDATE config_serial SET serial = '${numero_serial}'`);
  }
  try {
    rows_security = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM config_serial", (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
    configSerial = rows_security[0];
  } catch (error) {
    console.error(error.message);
  }

  if (numero_serial == configSerial.serial && configSerial.senha == null) {
    app.whenReady().then(createWindowImport);
  } else {
    var license = fs.readFileSync('C:/scoreboard/license.json', 'utf-8');
    var json = null;
    if (license) {
      json = JSON.parse(license)[0];
      console.log(json);
    }
    if (json.data_expiration != undefined && json.data_expiration != null) {
      var md5 = crypto.createHash('md5');
      md5.update(moment().format('YYYY-MM-DD HH:mm:ss'));
      data_atual = md5.digest('hex');
      if (configSerial.data_expiration_conf != null && configSerial.data_expiration_conf === json.data_expiration) {
        app.exit();
      }
      if (json.data_expiration === data_atual && json.data_expiration !== configSerial.data_expiration) {
        db.run(`UPDATE config_serial SET data_expiration_conf = '${json.data_expiration}'`);
        app.exit();
      }
    }
    if (json.serial != configSerial.serial && json.password != configSerial.senha && numero_serial != json.serial) {
      app.exit();
    }
    if (numero_serial != configSerial.serial || json.password != configSerial.senha) {
      app.exit();
    } else {
      app.whenReady().then(createWindow);
    }

  }
  db.close();
});
let importWindow;
async function createWindowImport() {
  importWindow = new BrowserWindow({
    width: 400,
    height: 400,
    minWidth: 400,
    minHeight: 400,
    icon: path.join(__dirname, 'resources/images/icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });
  // if (process.env.NODE_ENV !== 'development') {
  importWindow.setMenuBarVisibility(false);
  importWindow.resizable = false;
  // }
  // importWindow.webContents.openDevTools();

  importWindow.loadFile(path.join(__dirname, 'views', 'import_license.html'));
  importWindow.on("closed", () => {
    importWindow = null;
  });
}
async function createWindow() {

  db = new sqlite.Database('scoreboard.sqlite');
  try {
    rows = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM config_monitor", (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
    configMonitor = rows;
  } catch (error) {
    console.error(error.message);
  } finally {
    db.close();
  }
  console.log(configMonitor);
  // const displays = screen.getAllDisplays();
  // console.log(displays);
  // console.log(`file:${path.join(__dirname, 'views', 'index.html')}`);
  // console.log(path.join(__dirname, 'resources/images/icon.png'));
  firstWindow = new BrowserWindow({
    width: configMonitor[1].width,
    height: configMonitor[1].height,
    x: configMonitor[1].x,
    y: configMonitor[1].y,
    minWidth: 1224,
    minHeight: 768,
    fullscreen: configMonitor[1].fullscreen == 0 ? false : true,
    icon: path.join(__dirname, 'resources/images/icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });
  janelas.push(firstWindow);
  // if (process.env.NODE_ENV !== 'development') {
  firstWindow.setMenuBarVisibility(isDebug);

  // }
  // firstWindow.webContents.openDevTools();

  firstWindow.loadFile(path.join(__dirname, 'views', 'index.html'));
  firstWindow.maximize();
  if (configMonitor[0].show_monitor == 1) {
    createSecondWindow('placar.html');
  }
  if (configMonitor[2].show_monitor == 1) {
    createThirdWindow('tempo_ataque.html');
  }
  if (configMonitor[3].show_monitor == 1) {
    createFourthWindow();
  }
  if (configMonitor[4].show_monitor == 1) {
    createFifthWindow();
  }
  // createSecondWindow('placar.html');
  // createThirdWindow('tempo_ataque.html');
  // createFourthWindow();
  firstWindow.on("closed", () => {
    if (secondWindow)
      secondWindow.close();
    if (thirdWindow)
      thirdWindow.close();
    if (fourthWindow)
      fourthWindow.close();
    if (fifthWindow)
      fifthWindow.close();
    app.exit();
  })
  if (importWindow) {
    importWindow.close();
  }
}

function createSecondWindow(route) {
  secondWindow = new BrowserWindow({
    width: configMonitor[0].width,
    height: configMonitor[0].height,
    x: configMonitor[0].x,
    y: configMonitor[0].y,
    minWidth: 720,
    minHeight: 525,
    closable: true,
    fullscreen: configMonitor[0].fullscreen == 0 ? false : true,
    icon: path.join(__dirname, 'resources/images/icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });
  // secondWindow.webContents.openDevTools();
  janelas.push(secondWindow);
  // secondWindow.maximize();
  secondWindow.setMenuBarVisibility(isDebug);
  secondWindow.loadFile(path.join(__dirname, 'views', route));
  secondWindow.on("closed", () => {
    secondWindow = null;
  });
}
let configWindow = null;
function createConfigWindow(route) {
  configWindow = new BrowserWindow({
    width: 1224,
    height: 768,
    minWidth: 720,
    minHeight: 520,
    closable: false,
    icon: path.join(__dirname, 'resources/images/icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });
  janelas.push(configWindow);
  configWindow.maximize();
  configWindow.setMenuBarVisibility(isDebug);
  configWindow.loadFile(path.join(__dirname, 'views', route));
  configWindow.on("closed", () => {
    configWindow = null;
  });
}
ipcMain.on("send-alert", (event, incomingMessage) => {
  const options = {
    type: "none",
    buttons: ["OK"],
    title: "Alerta!",
    message: incomingMessage
  }
  dialog.showMessageBox(configWindow, options)
})
ipcMain.on("send-alert-imp", (event, incomingMessage) => {
  const options = {
    type: "none",
    buttons: ["OK"],
    title: "Alerta!",
    message: incomingMessage
  }
  dialog.showMessageBox(importWindow, options)
})
ipcMain.on("send-alert-main", (event, incomingMessage) => {
  const options = {
    type: "none",
    buttons: ["OK"],
    title: "Alerta!",
    message: incomingMessage
  }
  dialog.showMessageBox(firstWindow, options)
})
ipcMain.on('closeWindowConfig', (event, arg) => {
  if (arg == true) {
    firstWindow.webContents.reload()
    if (secondWindow) {
      secondWindow.webContents.reload()
    }
    if (thirdWindow) {
      thirdWindow.webContents.reload()
    }
    if (fourthWindow) {
      fourthWindow.webContents.reload()
    }
    if (fifthWindow) {
      fifthWindow.webContents.reload()
    }
  }
  if (configWindow) {
    configWindow.destroy();
  }
})
ipcMain.on('openWindowConfig', (event, arg) => {
  // console.log(arg)
  if (!configWindow) {
    createConfigWindow(arg);
  }
})

function createThirdWindow(route) {
  thirdWindow = new BrowserWindow({
    width: configMonitor[2].width,
    height: configMonitor[2].height,
    x: configMonitor[2].x,
    y: configMonitor[2].y,
    minWidth: configMonitor[2].min_width,
    minHeight: configMonitor[2].min_height,
    closable: true,
    fullscreen: configMonitor[2].fullscreen == 0 ? false : true,
    icon: path.join(__dirname, 'resources/images/icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });
  janelas.push(thirdWindow);
  thirdWindow.setMenuBarVisibility(isDebug);
  // thirdWindow.webContents.openDevTools();
  thirdWindow.loadFile(path.join(__dirname, 'views', route));
  thirdWindow.on("closed", () => {
    thirdWindow = null;
  });
}

function createFourthWindow() {
  fourthWindow = new BrowserWindow({
    width: configMonitor[3].width,
    height: configMonitor[3].height,
    x: configMonitor[3].x,
    y: configMonitor[3].y,
    minWidth: 900,
    minHeight: 300,
    closable: true,
    fullscreen: configMonitor[3].fullscreen == 0 ? false : true,
    icon: path.join(__dirname, 'resources/images/icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });
  janelas.push(fourthWindow);
  // fourthWindow.webContents.openDevTools();
  fourthWindow.setMenuBarVisibility(isDebug);
  fourthWindow.loadFile(path.join(__dirname, 'views', 'banner.html'));
  fourthWindow.on("closed", () => {
    fourthWindow = null;
  });
}
function createFifthWindow() {
  fifthWindow = new BrowserWindow({
    width: configMonitor[4].width,
    height: configMonitor[4].height,
    x: configMonitor[4].x,
    y: configMonitor[4].y,
    minWidth: configMonitor[4].min_width,
    minHeight: configMonitor[4].min_height,
    closable: true,
    fullscreen: configMonitor[4].fullscreen == 0 ? false : true,
    icon: path.join(__dirname, 'resources/images/icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });
  janelas.push(fifthWindow);

  fifthWindow.setMenuBarVisibility(isDebug);
  fifthWindow.loadFile(path.join(__dirname, 'views', 'tempo_ataque_2.html'));
  fifthWindow.on("closed", () => {
    fifthWindow = null;
  });
}
function updateSecondWindow(route) {
  secondWindow.loadFile(path.join(__dirname, 'views', route));
}
function updateFirstWindow(route) {
  firstWindow.loadFile(path.join(__dirname, 'views', route));
}

function updateThirdWindow(route) {
  thirdWindow.loadFile(path.join(__dirname, 'views', route));
}

function updateFourthWindow(route) {
  fourthWindow.loadFile(path.join(__dirname, 'views', 'banner.html'));
}
function updateFifthWindow(route) {
  fifthWindow.loadFile(path.join(__dirname, 'views', 'tempo_ataque_2.html'));
}
ipcMain.on("tempoJogo", (event, data) => {
  if (secondWindow) {
    secondWindow.webContents.send("tempoJogo", data);
  }
})
ipcMain.on('reload', (event, arg) => {
  if (firstWindow) {
    firstWindow.webContents.send('reloadAll', arg)
  }
  if (secondWindow) {
    secondWindow.webContents.send('reloadAll', arg)
  }
  if (fourthWindow) {
    fourthWindow.webContents.send('reloadAll', arg)
  }

})
ipcMain.on("solicitarLicenca", async (event, data) => {
  const db = new sqlite.Database('./scoreboard.sqlite');
  let configSeria;
  try {
    rows_security = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM config_serial", (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
    configSeria = rows_security[0];
  } catch (error) {
    console.error(error.message);
  }
  serial = configSeria.serial;
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: 'allmodetecnologias@gmail.com',
      pass: 'olxgortoymyijmpk ',
    },
  });
  const mailOptions = {
    from: 'allmodetecnologias@gmail.com',
    to: 'vitor@ideiasdeletra.com',
    subject: 'Número de Serial',
    text: `Olá, segue a solicitação da licença do scoreboard.
    Segue as informações:
      Email: ${data.email}
      Serial: ${serial}
    `,
  };

  // Enviar o e-mail
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Erro ao enviar o e-mail:', error);
    } else {
      console.log('E-mail enviado com sucesso:', info.response);
    }
  });
  importWindow.webContents.send('encaminhadoEmail', 'Licença solicitada com sucesso!');
})
ipcMain.on("importarLicenca", async (event, data) => {
  var arquivo = data;
  console.log(arquivo);
  var configLicense;
  const filePath = arquivo.arquivo;
  console.log(filePath);
  const newFilePath = 'C:/scoreboard/license.json';
  fs.copyFileSync(filePath, newFilePath);
  var newFile = fs.readFileSync(newFilePath, 'utf-8');
  var json = JSON.parse(newFile);
  if ('serial' in json[0]) {
    db = new sqlite.Database('./scoreboard.sqlite');
    try {
      rows = await new Promise((resolve, reject) => {
        db.all("SELECT * FROM config_serial", (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        });
      });
      configLicense = rows[0];
    } catch (error) {
      console.error(error.message);
    }
    if (configLicense.serial !== json[0].serial) {
      importWindow.webContents.send('atualizarLicenca-erro', 'Licença não válida!');
      return;
    }
    if (configLicense.senha === null) {
      db.run(`UPDATE config_serial SET senha = '${json[0].password}'`);
      if (configLicense.data_expiration === null && json[0].data_expiration !== null && json[0].data_expiration !== undefined && json[0].data_expiration !== '') {
        db.run(`UPDATE config_serial SET data_expiration = '${json[0].data_expiration}'`);
      }
      db.close();
      importWindow.webContents.send('atualizarLicenca', 'Licença importada com sucesso!');
    }
  } else {
    importWindow.webContents.send('atualizarLicenca-erro', 'Licença não válida!');
    return;
  }
})
ipcMain.on("abrirTelas", (event, data) => {
  createWindow();
})
ipcMain.on("openSecondWindow", (event, data) => {
  if (!secondWindow) {
    createSecondWindow(data);
  } else {
    updateSecondWindow(data);
  }
});

ipcMain.on("getDisplays", (event, data) => {
  configWindow.webContents.send('getDisplays_', screen.getAllDisplays());
})

ipcMain.on('alterarPontuacaoPlacar', (event, arg) => {
  if (secondWindow) {
    secondWindow.webContents.send('updatesFromControl', arg);
  } // sends the stuff from Window1 to Window2.
  if (thirdWindow) {
    thirdWindow.webContents.send('updatesFromControl', arg); // sends the stuff from Window1 to Window2.
  }
  if (fourthWindow) {
    fourthWindow.webContents.send('updatesFromControl', arg);
  }
  if (fifthWindow) {
    fifthWindow.webContents.send('updatesFromControl', arg);
  }

});

ipcMain.on("atualizarDesconto", (event, data) => {
  if (secondWindow)
    secondWindow.webContents.send('atualizaDesconto', data);
})
ipcMain.on('exportar-equipe-1', async (event, data) => {
  var equipe_time_1 = [];
  db = new sqlite.Database('scoreboard.sqlite');
  try {
    rows = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM config_equipas_times where id = 1", (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
    equipe_time_1 = rows;
    rows_jogadores = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM config_equipas_times_jogadores where time_id = 1", (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    })
    equipe_time_1_jogadores = rows_jogadores;
  } catch (error) {
    console.error(error.message);
  } finally {
    db.close();
  }
  var json_jogadores = [];
  equipe_time_1_jogadores.forEach(element => {
    var dt = {
      foto_caminho: element.foto_caminho,
      nome: element.nome,
      camisa: element.camisa,
      posicao: element.posicao,
      list: element.list
    }
    json_jogadores.push(dt);
  })
  var data_json = [
    {
      logo_caminho: equipe_time_1[0].logo_caminho,
      nome: equipe_time_1[0].nome,
      abreviatura: equipe_time_1[0].abreviatura,
      jogadores: json_jogadores
    }
  ]
  data_json = JSON.stringify(data_json);
  const filePath = path.join(app.getPath('temp'), `equipe_${equipe_time_1[0].nome}.json`);
  fs.writeFileSync(filePath, data_json);

  // Iniciar o download do arquivo
  configWindow.webContents.downloadURL('file://' + filePath);

})
ipcMain.on('exportar-t1', async (event, data) => {
  var tabela1 = [];
  db = new sqlite.Database('scoreboard.sqlite');
  try {
    rows = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM config_video_foto where tabela_id = 1 order by id", (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    })
    tabela1 = rows;
    tabela1.map(function (item, index) {
      return delete item.id;
    })
  } catch (error) {
    console.error(error.message);
  } finally {
    db.close();
  }
  data_json = JSON.stringify(tabela1);
  const filePath = path.join(app.getPath('temp'), `aquecimento.json`);
  fs.writeFileSync(filePath, data_json);
  configWindow.webContents.downloadURL('file://' + filePath);
})
ipcMain.on('exportar-t2', async (event, data) => {
  var tabela1 = [];
  db = new sqlite.Database('scoreboard.sqlite');
  try {
    rows = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM config_video_foto where tabela_id = 2 order by id", (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    })
    tabela1 = rows;
    tabela1.map(function (item, index) {
      return delete item.id;
    })
  } catch (error) {
    console.error(error.message);
  } finally {
    db.close();
  }
  data_json = JSON.stringify(tabela1);
  const filePath = path.join(app.getPath('temp'), `intervalo.json`);
  fs.writeFileSync(filePath, data_json);
  configWindow.webContents.downloadURL('file://' + filePath);
})
ipcMain.on('exportar-t3', async (event, data) => {
  var tabela1 = [];
  db = new sqlite.Database('scoreboard.sqlite');
  try {
    rows = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM config_video_foto where tabela_id = 3 order by id", (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    })
    tabela1 = rows;
    tabela1.map(function (item, index) {
      return delete item.id;
    })
  } catch (error) {
    console.error(error.message);
  } finally {
    db.close();
  }
  data_json = JSON.stringify(tabela1);
  const filePath = path.join(app.getPath('temp'), `desconto.json`);
  fs.writeFileSync(filePath, data_json);
  configWindow.webContents.downloadURL('file://' + filePath);
})
ipcMain.on('exportar-equipe-2', async (event, data) => {
  var equipe_time_2 = [];
  db = new sqlite.Database('scoreboard.sqlite');
  try {
    rows = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM config_equipas_times where id = 2", (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
    equipe_time_2 = rows;
    rows_jogadores = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM config_equipas_times_jogadores where time_id = 2", (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    })
    equipe_time_2_jogadores = rows_jogadores;
  } catch (error) {
    console.error(error.message);
  } finally {
    db.close();
  }
  var json_jogadores = [];
  equipe_time_2_jogadores.forEach(element => {
    var dt = {
      foto_caminho: element.foto_caminho,
      nome: element.nome,
      camisa: element.camisa,
      posicao: element.posicao,
      list: element.list
    }
    json_jogadores.push(dt);
  })
  var data_json = [
    {
      logo_caminho: equipe_time_2[0].logo_caminho,
      nome: equipe_time_2[0].nome,
      abreviatura: equipe_time_2[0].abreviatura,
      jogadores: json_jogadores
    }
  ]
  data_json = JSON.stringify(data_json);
  const filePath = path.join(app.getPath('temp'), `equipe_${equipe_time_2[0].nome}.json`);
  fs.writeFileSync(filePath, data_json);
  configWindow.webContents.downloadURL('file://' + filePath);
})
ipcMain.on('atualizacaoTelas', async (event, data) => {

  db = new sqlite.Database('scoreboard.sqlite');
  try {
    rows = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM config_monitor", (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
    configMonitor = rows;
  } catch (error) {
    console.error(error.message);
  } finally {
    db.close();
  }
  console.log(configMonitor);


  if (firstWindow) {
    firstWindow.setFullScreen(configMonitor[1].fullscreen);
    firstWindow.setBounds({
      x: configMonitor[1].x,
      y: configMonitor[1].y,
      width: configMonitor[1].width,
      height: configMonitor[1].height
    })
  }
  if (configMonitor[0].show_monitor == 0) {
    if (secondWindow) {
      secondWindow.close();
      secondWindow = null;
    }
  } else {
    if (secondWindow) {
      secondWindow.setFullScreen(configMonitor[0].fullscreen);
      secondWindow.setBounds({
        x: configMonitor[0].x,
        y: configMonitor[0].y,
        width: configMonitor[0].width,
        height: configMonitor[0].height
      })
    }
    if (!secondWindow)
      createSecondWindow('placar.html');
  }

  if (configMonitor[2].show_monitor == 0) {
    if (thirdWindow) {
      thirdWindow.close();
      thirdWindow = null;
    }
  } else {
    if (thirdWindow) {
      thirdWindow.setFullScreen(configMonitor[2].fullscreen);
      thirdWindow.setBounds({
        x: configMonitor[2].x,
        y: configMonitor[2].y,
        width: configMonitor[2].width,
        height: configMonitor[2].height
      })
    }
    if (!thirdWindow) {
      createThirdWindow('tempo_ataque.html');
    }
  }

  if (configMonitor[3].show_monitor == 0) {
    if (fourthWindow) {
      fourthWindow.close();
      fourthWindow = null;
    }
  } else {
    if (fourthWindow) {
      console.log(fourthWindow);
      fourthWindow.setFullScreen(configMonitor[3].fullscreen);
      fourthWindow.setBounds({
        x: configMonitor[3].x,
        y: configMonitor[3].y,
        width: configMonitor[3].width,
        height: configMonitor[3].height
      })
    }
    if (!fourthWindow)
      createFourthWindow();
  }
  if (configMonitor[4].show_monitor == 0) {
    if (fifthWindow) {
      fifthWindow.close();
      fifthWindow = null;
    }
  } else {
    if (fifthWindow) {
      console.log(fourthWindow);
      fifthWindow.setFullScreen(configMonitor[4].fullscreen);
      fifthWindow.setBounds({
        x: configMonitor[4].x,
        y: configMonitor[4].y,
        width: configMonitor[4].width,
        height: configMonitor[4].height
      })
    }
    if (!fifthWindow)
      createFifthWindow();
  }

})
ipcMain.on('alterarCronometro', (event, arg) => {
  if (secondWindow)
    secondWindow.webContents.send('updateCronometro', arg); // sends the stuff from Window1 to Window2.
  if (thirdWindow)
    thirdWindow.webContents.send('updateCronometro', arg);
  if (fourthWindow)
    fourthWindow.webContents.send('updateCronometro', arg);
  if (fifthWindow)
    fifthWindow.webContents.send('updateCronometro', arg);
});

ipcMain.on('sendCronometroFixed', (event, arg) => {
  if (secondWindowWindow)
    secondWindow.webContents.send('listingCronometro', arg);
});

ipcMain.on('sendCronometroAquecimento', (event, arg) => {
  if (firstWindow)
    firstWindow.webContents.send('updateAquecimento', arg);
});

ipcMain.on('sendCronometroDesconto', (event, arg) => {
  if (firstWindow)
    firstWindow.webContents.send('updateDesconto', arg);
});

ipcMain.on('sendCronometroIntervalo', (event, arg) => {
  if (firstWindow)
    firstWindow.webContents.send('updateIntervalo', arg);
});

ipcMain.on('solicitaAtualizacoes', (event, arg) => {
  if (firstWindow)
    firstWindow.webContents.send('getInformacoesPartida', arg);
});

ipcMain.on('sendInformacoesPartida', (event, arg) => {
  if (secondWindow)
    secondWindow.webContents.send('loadInformacoesPartida', arg);
});

ipcMain.on('sendNovaExclusao', (event, arg) => {
  if (secondWindow)
    secondWindow.webContents.send('addNovaExclusao', arg);
});

ipcMain.on("sendDescontoPainel", (event, arg) => {
  if (secondWindow)
    secondWindow.webContents.send('setDescontoPainel', arg);
});

ipcMain.on('salvarArquivo', async (event, arg) => {
  const filePath = arg['path'];
  const fileExtension = path.extname(filePath);
  const newFilePath = path.join(path.join(process.resourcesPath, 'assets', arg['newPath']), `${arg['imagePrefixo']}`);
  // const newFilePath = path.join(path.join(__dirname, 'resources', arg['newPath']), `${arg['imagePrefixo']}${fileExtension}`);
  // console.log(newFilePath);
  fs.copy(filePath, newFilePath, (err) => {
    if (err) {
      console.log(err);
      return;
    }
    console.log("Arquivo copiado com sucesso");
    console.log(newFilePath);
  });
});
ipcMain.on('validPassword', async (event, arg) => {
  if (arg === 'Scoreboard@2310') {
    configWindow.webContents.send('validPassword', true);
  } else {
    configWindow.webContents.send('validPassword', false);
  }
})
ipcMain.on('verificarArquivo', async (event, arg) => {
  const filePath = arg['path'];
  const fileExtension = path.extname(filePath);
  const newFilePath = path.join(path.join(process.resourcesPath, 'assets', arg['newPath']), `${arg['imagePrefixo']}${fileExtension}`);
  // const newFilePath = path.join(path.join(__dirname, 'resources', arg['newPath']), `${arg['imagePrefixo']}${fileExtension}`);
  console.log(newFilePath);
  var data = 'ok';
  if (fs.existsSync(newFilePath)) {
    // console.log('EI EI')
    data = 'existe';
  }
  console.log(data);
  configWindow.webContents.send('arquivoVerificado', data);
})

ipcMain.on('excluirArquivo', async (event, arg) => {
  // console.log('teste:' + arg);
  // arg.replace('../resources/', '');
  // const newFilePath = path.join(__dirname, 'resources', arg);
  // const newFilePath = arg;
  // if (fs.existsSync(newFilePath)) {
  //   fs.removeSync(newFilePath);
  //   console.log(`O arquivo ${newFilePath} foi apagado com sucesso!`);
  // }
})

ipcMain.on("novaPartida", (event, arg) => {
  if (secondWindow) {
    updateSecondWindow("placar.html");
  }
  if (thirdWindow) {
    updateThirdWindow("tempo_ataque.html");
  }
  if (fourthWindow) {
    updateFourthWindow();
  }
  if (fifthWindow) {
    updateFifthWindow();
  }
})

ipcMain.on('closeApp', (event, arg) => {
  app.quit();
});



app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

