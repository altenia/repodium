Repodium
=======

A nodejs-based application with web interface to manage collection of git repositories.


Motivation
==========
Our development team has multiple developers but there is only one single DEV server.
Often times a developer wants to share his/her work, eg. POC, with people for feedback. In order to push to the DEV web, the developer would require to merge his/her branch to master, but the code has not been reviewed, and thus cannot be merged to master.

This is where Gitirum comes. It can easily clone, pull a branch from a repository using a web interface.

The recommended practice is to keep the master branch, and have repos (clones) per developer.


Install
=======
To install use the npm:

	npm install altenia/gitrium

Alternatively you can clone it:
	
	git clone https://github.com/altenia/repodium.git

And then install dependencies

	npm install

Start
=====

	node repodiumsvr.js

To run as backround servier in *nix platform

	nohup node repodiumsvr.js


Configure
=========
You can specify in which diretory you want to clone repositories.


Usage
=====
It should be intuitive enough. Basically you will clone a project from remote git server.
Once cloned, you can change branches, browse logs, pull, and build (currently only make is supported).

http://<server>:<port>/repodium/public/index.html