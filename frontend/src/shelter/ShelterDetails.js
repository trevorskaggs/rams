import React, { useEffect, useState } from 'react';
import axios from "axios";
import { Link } from 'raviger';
import { Button } from 'reactstrap';
import { BuildingList } from "./Building";
import { RoomList } from "./Room";

const link_style = {
  textDecoration: "none",
};

export function ShelterDetailsTable({sid}) {
  const [data, setData] = useState({});

  // Hook for initializing data.
  useEffect(() => {
    console.log('shelter: ' + sid)
    let source = axios.CancelToken.source();
    const fetchShelterData = async () => {
    // Fetch Shelter Details data.
    await axios.get('http://localhost:8000/shelter/api/shelter/' + sid + '/', {
        cancelToken: source.token,
    })
    .then(response => {
        setData(response.data);
        console.log(response.data);
    })
    .catch(e => {
        console.log(e);
    });
    };
    fetchShelterData();
  }, [sid]);

  return (
    <>
      <p><b>Name:</b> {String(data.name)}</p>
      <p><b>Adress:</b> {String(data.address)}</p>
      <p><b>City:</b> {String(data.city)}</p>
      <p><b>State:</b> {String(data.state)}</p>
      <p><b>Zip:</b> {String(data.zip_code)}</p>
      <p><b>Description:</b> {String(data.description)}</p>
      <p><b>Image:</b> {String(data.image)}</p>
      <hr/>
      <Link href={"/shelter/edit/" + data.id}><Button color="warning">EDIT SHELTER</Button></Link>
      <h3>Shelter Buildings</h3>
      <BuildingList sid={data.id} />
      <hr/>
      <Link href={"/shelter/" + data.id + "/building/new"}><Button color="primary">CREATE NEW SHELTER</Button></Link>
      <Link href="/shelter/list"><Button color="secondary">BACK</Button></Link>
    </>
  );
};

export function BuildingDetailsTable({bid}) {
  const [data, setData] = useState({});

  // Hook for initializing data.
  useEffect(() => {
    console.log('builing: ' + bid)
    let source = axios.CancelToken.source();
    const fetchShelterData = async () => {
    // Fetch Shelter Details data.
    await axios.get('http://localhost:8000/shelter/api/building/' + bid, {
        cancelToken: source.token,
    })
    .then(response => {
        setData(response.data);
        console.log(response.data);
    })
    .catch(e => {
        console.log(e);
    });
    };
    fetchShelterData();
  }, [bid]);

  return (
    <>
      <p><b>Name:</b> {String(data.name)}</p>
      <p><b>Shelter:</b> {String(data.shelter)}</p>
      <p><b>Description:</b> {String(data.description)}</p>
      <hr/>
      <Link href={"/shelter/building/edit/" + data.id}><Button color="warning">EDIT BUILDING</Button></Link>
      <h3>Building Rooms</h3>
      <RoomList bid={data.id} />
      <hr/>
      <Link href={"/shelter/building/" + data.id + "/room/new"}><Button color="primary">NEW ROOM</Button></Link>
      <Link href="/shelter/list"><Button color="secondary">BACK</Button></Link>
    </>
  );
};

export function RoomDetailsTable({rid}) {
  const [data, setData] = useState({});

  // Hook for initializing data.
  useEffect(() => {
    console.log('builing: ' + rid)
    let source = axios.CancelToken.source();
    const fetchShelterData = async () => {
    // Fetch Shelter Details data.
    await axios.get('http://localhost:8000/shelter/api/room/' + rid, {
        cancelToken: source.token,
    })
    .then(response => {
        setData(response.data);
        console.log(response.data);
    })
    .catch(e => {
        console.log(e);
    });
    };
    fetchShelterData();
  }, [rid]);

  return (
    <>
      <p><b>Name:</b> {String(data.name)}</p>
      <p><b>Shelter:</b> {String(data.shelter)}</p>
      <p><b>Description:</b> {String(data.description)}</p>
      <hr/>
      <Link href={"/shelter/room/edit/" + data.id}><Button color="warning">EDIT ROOM</Button></Link>
      <Link href="/shelter/list"><Button color="secondary">BACK</Button></Link>
    </>
  );
};