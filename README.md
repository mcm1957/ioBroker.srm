![](admin/synology.png)

## Table of Contents

-   [Introduction](#Introduction)
-   [Usage](#Usage)
-   [Revision History](#Revision-History)

<a name="Introduction"></a>

## Introduction

This is an iobroker adapter to connect to Synology routers. The adapter uses the Synology API to get the data. The adapter is tested with the SRM version 1.3.1. and router model RT6600 but should work with other models as well.

Thanks to 

* [Nocilas](https://github.com/nioc) who provider the connector for the Synology API.
* The countless iobroker adapters that I used as a template, especially [asuswrt](https://github.com/mcdhrts/ioBroker.asuswrt).

<a name="Requirements"></a>

## Usage

### Installation
Create a new instance of the adapter and enter the IP address of your router. The port is 8001 by default. Enter user name and password of your router. Make sure that the user is not using 2FA.

### Objects
The adapter creates the following objects:

### Sentry

What is Sentry.io and what is reported to the servers of that company? `Sentry.io` is a service for developers to get an overview about errors from their applications. And exactly this is implemented in this adapter.

When the adapter crashes or another Code error happens, this error message that also appears in the ioBroker log is submitted to Sentry. When you allowed iobroker GmbH to collect diagnostic data then also your installation ID (this is just a unique ID **without** any additional infos about you, email, name or such) is included. This allows Sentry to group errors and show how many unique users are affected by such an error. 

<a name="Revision-History"></a>

## Revision History

### **WORK IN PROGRESS**

### Version 0.0.1

-   First public release


