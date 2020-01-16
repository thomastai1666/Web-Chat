var myname = "";
var isloggedin = false;
var users = 1;
var activeChat = "";
var date = new Date;
var audio = new Audio('ding.mp3');
var groupchatids = [];
var groups = 0;
var names = [];

$(function () {
    var socket = io();

    //hide error banner at document load
    $("#banneralert").hide();

    // client: server disconnected
    socket.on('disconnect', function(){
      // Do stuff (probably some jQuery)
      showBanner("Disconnected from server. Server may be down - attempting to reconnect");
      setTimeout(function(){ location.reload(true); }, 3000);
      //reload page from server without cache
    });

    //client --> server: message sent
    $('#messageBar').submit(function(e){
      e.preventDefault();
      var message = $('#messageForm').val()
      $('#messageForm').val('');
      //global chat
      console.log(activeChat);
      if(activeChat == "global"){
        socket.emit('chat message', message);
      }
      //group chat
      else if( $.isNumeric(activeChat) ){
        console.log("Test");
        var targetdiv = "#" + activeChat + "chatlist";
        createMessage(targetdiv, myname, message);
        socket.emit('send message', {
        room: activeChat,
        message: message
      });

      }
      //private user to user chat
      else{
        // console.log('private message', {target: activeChat, message: message});
        var targetdiv = "#" + activeChat + "chatlist";
        createMessage(targetdiv, myname, message);
        // $( targetdiv ).append($('<li>').text(myname + ": \n" + message));
        socket.emit('private message', {target: activeChat, message: message})
        console.log("private message sent");
        $(targetdiv).scrollTop($(targetdiv)[0].scrollHeight);
      }
      return false;
    });

    //client --> server: username submission
    $('#loginBar').submit(function(e){
      e.preventDefault();
      socket.emit('login', $('#loginForm').val());
      myname = $('#loginForm').val();
      $('#loginForm').val('');
      return false;
    });

    // client: generate user list
    $("#creategroupchat").click(function(){
        generateUsers();
    });

    // client -> server: create new groupchat
    $("#userselectionsubmit").click(function(){
        var values = $('#userselection').val();
        socket.emit("create chatroom", {users: values});
        console.log(values);
    });

    // server --> client: confirm new groupchat
    socket.on('confirmgroup', function(data){
        var groupid = data.id;
        var names = data.names;
        console.log("Confirmed group with id" + groupid);
        groups += 1;
        createGroup(groupid, names);
        // $('#userselectionmodal').modal('hide');
        socket.emit('joinroom', groupid);
    });

    // server --> client: received group message
    socket.on('groupchatmsg', function(data){
        console.log(data.sender);
        console.log(data.target);
        console.log(data.message);
        var targetdiv = "#" + data.target + "chatlist";
        createMessage(targetdiv, data.sender, data.sender + ": " + data.message);
        $(targetdiv).scrollTop($(targetdiv)[0].scrollHeight);
        showNotification( data.target );
    });


    //server --> client: login ok
    socket.on('loginok', function(name){
      if(myname == name){
        // $('#messages').append($('<li>').text("My Name: " + name));
        isloggedin = true;
        $('#myname').text(name);
        removeLogin();
        activeChat = "global";
        socket.emit( 'update groups' );
        updateHeadings();
      }
    });

    //server --> client: login duplicate
    socket.on('loginfail', function(name){
      showBanner(name + " has been taken, please try a different name.");
    });

    //server --> client: login invalid? should not happen
    socket.on('logininvalid', function(name){
      showBanner("Name can only contain letters, please try a different name.");
    });

    //server --> client: display message
    socket.on('chat message', function(data){
      if(isloggedin){
        var msg = data.message;
        var name = data.clientname;
        $('#globalmessages').append($('<li>').text(msg));
        // console.log(name);
        // createMessage('#globalmessages', name, msg);
        $("#globalmessages").scrollTop($("#globalmessages")[0].scrollHeight);
      }
    });

    //server --> client: display private message
    socket.on('private message', function(data){
      var sender = data.target;
      var msg = data.message;
      var targetid = "#"+ sender + "chatlist"
      // $( targetid ).append($('<li>').text(sender + ": " + msg));
      createMessage(targetid, sender, msg);
      $(targetid).scrollTop($(targetid)[0].scrollHeight);
      showNotification( sender );
    });

    //client --> server: user list update on connect
    socket.on('userlist', function(names){
      updateUsers(names);
      users = names.length;
    });

    //client --> server: user list on user connect
    socket.on('user add', function(name){
      // console.log("User add " + name);
      if(isloggedin){
        addUser(name);
        users += 1;
        updateCounter();
      }
    });


    //server --> client: user disconnect
    socket.on('user disconnect', function(name){
      console.log(name);
      console.log(isloggedin);
      if(isloggedin){
        // console.log("User remove: " + name);
        removeUser(name);
        users -=1;
        updateCounter();
      }
    });

  });

function updateCounter(){
  document.getElementById("usercounter").innerHTML = "There are " +users +" users online right now";
  if(users == 1){
    document.getElementById("usersheading").style.display = "none";
  }
  else{
    document.getElementById("usersheading").style.display = "inline";
  }
}

function removeLogin(){
  //fade out login box
  $("#loginDiv").fadeTo(500, 0, "linear", function(){
      $("#loginDiv").remove();
    });
}

function showBanner(message){
    $( "#bannermessage" ).text( message );
    $("#banneralert").fadeTo(2000, 500).slideUp(500, function(){
    $("#banneralert").slideUp(500);
    });
}

function updateUsers(users){
  // console.log(users);
  for(let i = 0; i < users.length; i++){
       addUser(users[i]);
  }
}

function addUser(name){
  if(name != myname){
  names.push(name);
  // Create new div for user
  var newtab = document.createElement("DIV");
  newtab.className = 'tabcontent';
  newtab.id = "chatbox" + name;
  //Add heading and track using chat name
  var heading = document.createElement("H3");
  heading.innerHTML = "You are talking to " + name;
  newtab.appendChild(heading);
  //Add subheading
  var subheading = document.createElement("P");
  var node = document.createTextNode("Send a message to begin a private conversation");
  subheading.appendChild(node);
  newtab.appendChild(subheading);
  //Add message list
  var list = document.createElement('UL');
  list.className = "messages";
  list.id = name + "chatlist";
  newtab.appendChild(list);
  newtab.style.display = "none";
  //Append to chatbox div
  document.getElementById('userPages').appendChild(newtab);
  // Create a <button> element and append to sidebar
  var newbutton = document.createElement("BUTTON");
  newbutton.className = 'tablinks';
  newbutton.id = "chatboxbutton" + name;
  //Add envelope to button
  var mail = document.createElement("I");
  mail.className = 'fas fa-circle online';
  newbutton.appendChild(mail);
  //Add name to button
  var buttonname = document.createElement("P");
  buttonname.className = 'buttonlabel';
  var node = document.createTextNode(name);
  buttonname.appendChild(node);
  newbutton.appendChild(buttonname);
  //Add notification bell to button
  var icon = document.createElement("I");
  icon.className = 'fas fa-bell notification';
  icon.id = "notification" + name;
  icon.style.display = "none";
  newbutton.appendChild(icon);
  //Add button onclick function to link to chatbox
  newbutton.onclick = function(){openChat(event, "chatbox" + name);};
  document.getElementById('users').appendChild(newbutton);
  //Update search and headings
  searchUser();
  updateHeadings();
  }
}

function removeUser(name){
  //Clean up user labels and tabs
  $("#chatbox" + name).remove();
  $("#chatboxbutton" + name).remove();
}

function openChat(evt, name) {
  // Declare all variables
  var i, tabcontent, tablinks;

  // Get all elements with class="tabcontent" and hide them
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }

  // Get all elements with class="tablinks" and remove the class "active"
  tablinks = document.getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }

  // Show the current tab, and add an "active" class to the link that opened the tab
  document.getElementById(name).style.display = "block";
  if(name != "chatboxglobal"){
    evt.currentTarget.className += " active";
  }

  //remove chatbox from string
  activeChat = name.slice(7);
  // console.log(activeChat);
  var chatselection = document.getElementById("notification" + activeChat);
  if(chatselection != null){
    chatselection.style.display = "none";
  }
}

function showNotification(name){
  console.log(name);
  audio.play();
  //show notification if not on active tab
  if(name != activeChat){
    var chatselection = document.getElementById("notification" + name);
    chatselection.style.display = "inline-block";
    chatselection.style.animation = "fade-in-out 3s forwards";
  }
}

function searchUser(){
  var search = document.getElementById("searchbar").value.toUpperCase();
  var sidebar = document.getElementById("userlist");
  var sidebarbuttons = sidebar.getElementsByTagName("button");
  var results = 0;
  for (let i = 0; i < sidebarbuttons.length; i++) {
     var name = sidebarbuttons[i].getElementsByTagName("p")[0].innerText;
     console.log(sidebarbuttons[i].getElementsByTagName("p"));
     if(name.toUpperCase().indexOf(search) > -1){
       sidebarbuttons[i].style.display = "block";
       results += 1;
     }
     else{
       sidebarbuttons[i].style.display = "none";
     }
  }
  console.log(search);
  //return results by hiding others
  if(results == 0){
    document.getElementById("searchprompt").style.display = "block";
  }
  else{
    document.getElementById("searchprompt").style.display = "none";
  }
  updateHeadings();
}

function updateHeadings(){
  console.log(groups);
  var search = document.getElementById("searchbar").value;
  console.log(search);
  if(search == ""){
    document.getElementById("searchprompt").style.display = "none";
    document.getElementById("usersheading").style.display = "inline";
    document.getElementById("groupsheading").style.display = "inline";
    if(users == 1){
      document.getElementById("usersheading").style.display = "none";
    }
    else{
      document.getElementById("usersheading").style.display = "inline";
    }
    if(groups == 0){
      document.getElementById("groupsheading").style.display = "none";
    }
    else{
      document.getElementById("groupsheading").style.display = "inline";
    }
  }
  else{
    document.getElementById("usersheading").style.display = "none";
    document.getElementById("groupsheading").style.display = "none";
  }
}

function createMessage(target, clientname, message){
  var newrow = document.createElement("LI");
  var newdiv = document.createElement("DIV")
  newdiv.className = 'messageBubble';
  if(clientname == myname){
    newdiv.className = 'messageBubble myself';
  }
  // var name = document.createElement("P");
  // var node = document.createTextNode(clientname);
  // name.appendChild(node);
  var messageText = document.createElement("P");
  var node = document.createTextNode(message);
  messageText.appendChild(node);
  // newdiv.appendChild(name);
  newdiv.appendChild(messageText);
  console.log(target);
  $( target ).append(newdiv);
  $( newdiv ).hide();
  if(clientname == myname){
  $( newdiv ).show("slide", { direction: "down" }, 300);
  }
  else{
  $( newdiv ).show("slide", { direction: "left" }, "easeInOutCircle", 300);
  }
}


function createGroup(id, names){
  var newtab = document.createElement("DIV");
  newtab.className = 'tabcontent';
  newtab.id = "chatbox" + id;
  //Add heading and track using chat name
  var heading = document.createElement("H3");
  heading.innerHTML = "Group Conversation";
  newtab.appendChild(heading);
  //Add subheading
  var subheading = document.createElement("P");
  var node = document.createTextNode("Users: " +names.join(', '));
  subheading.appendChild(node);
  newtab.appendChild(subheading);
  //Add message list
  var list = document.createElement('UL');
  list.className = "messages";
  list.id = id + "chatlist";
  newtab.appendChild(list);
  newtab.style.display = "none";
  //Append to chatbox div
  document.getElementById('userPages').appendChild(newtab);
  // Create a <button> element and append to sidebar
  var newbutton = document.createElement("BUTTON");
  newbutton.className = 'tablinks';
  newbutton.id = "chatboxbutton" + id;
  //Add envelope to button
  var mail = document.createElement("I");
  mail.className = 'fas fa-users';
  newbutton.appendChild(mail);
  //Add name to button
  var buttonname = document.createElement("P");
  buttonname.className = 'buttonlabel';
  var node = document.createTextNode("Conversation #" + id);
  buttonname.appendChild(node);
  newbutton.appendChild(buttonname);
  //Add notification bell to button
  var icon = document.createElement("I");
  icon.className = 'fas fa-bell notification';
  icon.id = "notification" + id;
  icon.style.display = "none";
  newbutton.appendChild(icon);
  //Add button onclick function to link to chatbox
  newbutton.onclick = function(){openChat(event, "chatbox" + id);};
  document.getElementById('groups').appendChild(newbutton);
  //Update search and headings
  searchUser();
  updateHeadings();
}

function generateUsers(){
  var userslist = document.getElementById("userselection");
  userslist.innerHTML = "";
  // console.log(names);
  for(let i = 0; i < users-1; i++){
      var option = document.createElement("OPTION");
      option.value = names[i];
      option.textContent = names[i];
      // console.log(option);
      userslist.appendChild(option);
  }
}
