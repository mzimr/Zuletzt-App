const STORAGE = "zuletztTasks";

let tasks = JSON.parse(localStorage.getItem(STORAGE)) || [];

const list = document.getElementById("taskList");

const input = document.getElementById("taskInput");

const addButton = document.getElementById("addButton");

const today = document.getElementById("todayCount");

const done = document.getElementById("doneCount");

const open = document.getElementById("openCount");

function save(){

localStorage.setItem(STORAGE,JSON.stringify(tasks));

render();

}

function render(){

list.innerHTML="";

tasks.forEach((task,index)=>{

const li=document.createElement("li");

if(task.done){

li.classList.add("done");

}

const text=document.createElement("span");

text.innerText=task.title;

const buttons=document.createElement("div");

buttons.className="taskButtons";

const finish=document.createElement("button");

finish.innerText="✓";

finish.onclick=()=>{

task.done=!task.done;

save();

};

const remove=document.createElement("button");

remove.innerText="🗑";

remove.onclick=()=>{

tasks.splice(index,1);

save();

};

buttons.appendChild(finish);

buttons.appendChild(remove);

li.appendChild(text);

li.appendChild(buttons);

list.appendChild(li);

});

today.innerText=tasks.length+" Aufgaben";

done.innerText=tasks.filter(t=>t.done).length;

open.innerText=tasks.filter(t=>!t.done).length;

}

addButton.onclick=()=>{

if(input.value.trim()=="") return;

tasks.push({

title:input.value,

done:false

});

input.value="";

save();

};

document.getElementById("darkModeButton").onclick=()=>{

document.body.classList.toggle("dark");

localStorage.setItem(

"theme",

document.body.classList.contains("dark")

);

};

if(localStorage.getItem("theme")=="true")

document.body.classList.add("dark");

render();

if("serviceWorker" in navigator){

navigator.serviceWorker.register("sw.js");

}
