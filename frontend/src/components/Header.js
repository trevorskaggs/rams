import React from 'react';
import { Col, Row } from 'react-bootstrap';

function Header({...props}) {

  return (
    <Row className="mt-2" style={{marginBottom:"-15px"}}>
      <Col xs={12} className="d-flex">
        <h1>{props.children}</h1>
      </Col>
    </Row>
  )
}

export default Header;
