
var tempo = 750 ; // milisegundos.
var timeout = false;
var relogio = null;

var chance_erro = 0;
var chance_atraso = 0;
var velocidade = 1;

var receptor = null;
var transmissor = null;


// ----------------------------------------------------------------------- //

function Pacote (){
    this.posicao = 0;
    this.tipo = "normal";
    this.numero = 0;
    this.timeout = false;

    // metodo que desenha o pacote na simulacao
    this.desenha = function(){
        p = $("#linha-de-envio div.posicao-"+ this.posicao +" p.pacote");
        p.html(this.numero);
        p.addClass(this.tipo);
        if (this.timeout == false){
            //simula interferencia
            if (this.posicao == 1){
                if ((Math.random()*10) < chance_erro ){
                    this.tipo = "erro"; 
                    transmissor.mensagem("Interferencia");    
                }
            }
        }else{
            p.html(this.numero + " timeout");
        }  
        this.posicao+=1;
    }
}


// ----------------------------------------------------------------------- //

function Resposta (){
    this.posicao = 4;
    this.tipo = "ack";
    this.numero = 0;
    this.atrasou = false;

    // metodo que desenha a resposta
    this.desenha = function(){
        p = $("#linha-de-resposta div.posicao-"+ this.posicao +" p.pacote");
        p.html(this.numero);
        p.addClass(this.tipo);

        // simula interferencia 
        if (transmissor.pacotes.length==0){ 
            if ( this.posicao == 3 ){
                if ((Math.random()*10) < chance_atraso){
                    this.atrasou = true;
                    timeout = true;
                }
            }   
        }
        if (this.atrasou){
            p.html(this.numero+" atrasado");
        }
        this.posicao-=1;
    }
}


// ----------------------------------------------------------------------- //

function Receptor(){
    this.numero_ultimo_pacote = null;
    this.respostas = new Array(); 

    // metodo que recebe o pacote e decide qual resposta enviar.
    this.recebe = function(pacote){ 
        this.mensagem(" ");
        resp = new Resposta();

        //  chegou pacote normal
        if (pacote.tipo == "normal"){ 
            if (pacote.numero == 0){resp.numero = 1 }else {resp.numero = 0};

            if (pacote.numero != this.numero_ultimo_pacote){         
                 this.numero_ultimo_pacote = pacote.numero;
            }else{
                this.mensagem("IGNORANDO! pacote duplicado!");
            }
        // chegou pacote com problema        
        }else{
            if (pacote.numero != this.numero_ultimo_pacote){         
                resp.tipo = "nack";
                resp.numero = pacote.numero;
            }else {
                this.mensagem("IGNORANDO! pacote duplicado!");
                resp.tipo = "ack"; 
                if (pacote.numero == 0){resp.numero = 1 }else {resp.numero = 0};
            }
        }
       
        this.respostas.push(resp);
    };

    this.atualiza_respostas = function(){
        if (this.respostas.length==0) return;

        // desenha respostas na linha de transmissao.
        for (i in this.respostas){
            this.respostas[i].desenha();
        }

        // checa se a resposta chegou no transmissor
        resposta = this.respostas[0];
        if (resposta.posicao == 0){ 
            transmissor.recebe(resposta);
            this.respostas.shift(); 
        }
    }

    this.mensagem = function(texto){ $("#mensagem-receptor").html(texto); };
}


// ----------------------------------------------------------------------- //

function Transmissor(){
    this.numero_ultima_resposta = 0; 
    this.pacotes = new Array();

    // metodo que recebe as respostas e decidade se envia ou reenvia pacotes
    this.recebe = function(resposta){ 
        this.mensagem(" ");
        pack = new Pacote();
        if (resposta.tipo == "ack"){  
             if (resposta.numero != this.numero_ultima_resposta){
                pack.numero = resposta.numero; 
                this.envie(pack);
             }else{
                this.mensagem("IGNORANDO! ACK duplicado!");
            }
        }else{ // nack
            pack.numero = this.numero_ultima_resposta;
            this.envie(pack);
        }
    }

    // metodo executado quando acontece o timeout 
    this.timeout = function(){
        pack = new Pacote();
        pack.numero = this.numero_ultima_resposta;
        pack.posicao = 1;
        pack.timeout = true;
        this.envie(pack); 
        timeout = false;
        atualiza_simulacao();
    }

    this.envie = function(pacote){
        this.numero_ultima_resposta = pacote.numero;
        this.pacotes.push(pacote);
    }

    this.atualiza_pacotes = function (){
        if (this.pacotes.length==0) return;  
        for (i in this.pacotes){
            this.pacotes[i].desenha();
        }
        
        // verifica se algum pacote chegou ao receptor
        pacote = this.pacotes[0];
        if (pacote.posicao == 4){ 
            receptor.recebe(pacote);
            this.pacotes.shift(); 
        }
    }
    
    this.mensagem = function(texto){ $("#mensagem-transmissor").html(texto); };
    
}



// ----------------------------------------------------------------------- //


function comeca_simulacao(){
    // ler dados da simulacao
    chance_atraso = parseFloat($("#chance-atraso").val());
    chance_erro = parseFloat($("#chance-erro").val());
    velocidade = parseFloat($("#velocidade").val());
    tempo = 750.0 / velocidade;
   
    // esconde controles e imprime dados na tela
    $("#inicia-simulacao, select, label").hide();
    $("#para-simulacao").show();
    var msg =  "Chance de Erro: "+(chance_erro*10)+"% <br>";
    msg += "Chance de Timeout: "+(chance_atraso * 10) +"% <br>";
    $("#chances").html(msg);    

    // inicia a simulacao
    timeout = false;
    var p = new Pacote();
    receptor = new Receptor();
    transmissor = new Transmissor();
    transmissor.envie(p);
   
    // registra um timer para chamar a funcao atualiza_simulacao 
    relogio = setTimeout("atualiza_simulacao();",tempo); 
}

function atualiza_simulacao(){
    // apaga desenhos anteriores
    $("p.pacote").removeClass("normal"); 
    $("p.pacote").removeClass("erro"); 
    $("p.pacote").removeClass("ack");
    $("p.pacote").removeClass("nack");

    // atualiza novos desenhos
    transmissor.atualiza_pacotes();
    receptor.atualiza_respostas();
   
    // chama novamente a funcao apos algum tempos
    if (timeout == false){
         relogio = setTimeout("atualiza_simulacao();",tempo); 
    }else{
         relogio = setTimeout("transmissor.timeout();",tempo*2); // acontece timeout apos 2 tick de tempo.
    }
}


function parar_simulacao(){  
    // cancela atualizacao da simulacao
    clearTimeout(relogio)

    // apaga desenhos anteriores
    $("p.pacote").removeClass("normal"); 
    $("p.pacote").removeClass("erro"); 
    $("p.pacote").removeClass("ack");
    $("p.pacote").removeClass("nack");

    // reseta a aparencia
    $("#para-simulacao").hide();
    $("#chances").html("");
    $("#inicia-simulacao, select, label").show();
    transmissor.mensagem("Transmissor");
    receptor.mensagem("Receptor");
    
    transmissor = null;
    receptor = null; 
}






