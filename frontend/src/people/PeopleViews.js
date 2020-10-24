import React, {useEffect, useState} from 'react';
import axios from "axios";
import { Link } from 'raviger';
import { Card, ListGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClipboardList, faEdit, faPlusSquare
} from '@fortawesome/free-solid-svg-icons';
import ReactImageFallback from 'react-image-fallback';
import noImageFound from '../static/images/image-not-found.png';
import History from '../components/History';

export function PersonView({id}) {

  // Determine if this is an owner or reporter when creating a Person.
  var is_owner = window.location.pathname.includes("owner")

  const [data, setData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    best_contact: '',
    agency: '',
    drivers_license: '',
    address: '',
    apartment: '',
    city: '',
    state: '',
    zip_code: '',
    animals: [],
    action_history: [],
  });

  // Hook for initializing data.
  useEffect(() => {
    let source = axios.CancelToken.source();
    const fetchPersonData = async () => {
      // Fetch Person data.
      await axios.get('/people/api/person/' + id + '/', {
        cancelToken: source.token,
      })
      .then(response => {
        setData(response.data);
        console.log(response.data);
      })
      .catch(error => {
        console.log(error.response);
      });
    };
    fetchPersonData();
  }, [id]);

  return (
    <>
    <div className="row mt-3" style={{marginBottom:"-8px"}}>
      <div className="col-12 d-flex">
        <h1 style={{textAlign:"center"}}>
        {is_owner ?
          <span>Owner Details<Link href={"/hotline/owner/edit/" + id}> <FontAwesomeIcon icon={faEdit} inverse /></Link></span> :
          <span>Reporter Details<Link href={"/hotline/reporter/edit/" + id}> <FontAwesomeIcon icon={faEdit} inverse /></Link></span>
        }
        </h1>
      </div>
    </div>
    <hr/>
    <div className="row">
      <div className="col-6 d-flex" style={{marginRight:"-15px"}}>
        <Card className="border rounded d-flex" style={{width:"100%"}}>
          <Card.Body>
            <Card.Title>
              <h4>Information</h4>
            </Card.Title>
            <hr/>
            <ListGroup variant="flush" style={{marginTop:"-13px", marginBottom:"-13px"}}>
              <ListGroup.Item><b>Name: </b>{data.first_name} {data.last_name}</ListGroup.Item>
              {data.phone ? <ListGroup.Item><b>Telephone: </b>{data.phone}</ListGroup.Item> : ""}
              {data.email ? <ListGroup.Item><b>Email: </b>{data.email}</ListGroup.Item> : ""}
              {data.best_contact ?
                <ListGroup.Item><b>Best Contact: </b>{data.best_contact}</ListGroup.Item>: ''}
              {data.agency ?
                <ListGroup.Item><b>Agency: </b>{data.agency}</ListGroup.Item>: ''}
              <ListGroup.Item><b>Address: </b>{data.address ? data.full_address : 'N/A'}</ListGroup.Item>
              {data.request ?
                <ListGroup.Item><b>Service Request: </b>#{data.request}<Link href={"/hotline/servicerequest/" + data.request}> <FontAwesomeIcon icon={faClipboardList} size="sm" inverse /></Link></ListGroup.Item>: ''}
            </ListGroup>
          </Card.Body>
        </Card>
      </div>
    </div>
    <div className="row mb-2 mt-3" hidden={data.animals.length === 0}>
      <div className="col-12 d-flex">
        <Card className="mb-2 border rounded" style={{width:"100%"}}>
          <Card.Body>
            <Card.Title>
              <h4 className="mb-0">Animals<Link href={"/hotline/animal/new?owner_id=" + id}> <FontAwesomeIcon icon={faPlusSquare} inverse /></Link></h4>
            </Card.Title>
            <hr/>
            <span className="d-flex flex-wrap align-items-end">
            {data.animals.map(animal => (
              <Card key={animal.id} className="mr-3" style={{border:"none"}}>
                <ReactImageFallback style={{width:"151px"}} src={animal.front_image} fallbackImage={[animal.side_image, noImageFound]} />
                <Card.Text className="text-center mb-0">
                  {animal.name||"Unknown"}
                  <Link href={"/animals/animal/" + animal.id}> <FontAwesomeIcon icon={faClipboardList} inverse /></Link>
                  <Link href={"/animals/animal/edit/" + animal.id}> <FontAwesomeIcon icon={faEdit} inverse /></Link>
                </Card.Text>
                <Card.Text className="text-center mb-0">
                  {animal.status}
                </Card.Text>
                <Card.Text className="text-center" style={{textTransform:"capitalize"}}>
                  {animal.size} {animal.species}
                </Card.Text>
              </Card>
            ))}
            </span>
          </Card.Body>
        </Card>
      </div>
    </div>
    <History action_history={data.action_history} />
    </>
  );
};
