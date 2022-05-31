import React, { useRef, useState, useEffect } from 'react';
import styled from 'styled-components';
import { Link, navigate } from 'raviger';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Collapse, ListGroup, Nav } from 'react-bootstrap';
import { faHome, faBullhorn, faChevronDown, faChevronUp, faPhone, faSearch, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import { logoutUser } from ".././accounts/AccountsUtils";

export const StyledMenu = styled(Nav)`
  background: ${({ theme }) => theme.primaryDark};
  text-align: left;
  padding: 1.5rem;
  float: left;
  margin-left: 0;
  margin-top: -15px;
  height: 100vh;
  top: 0;
  left: 0;
  @media (max-width: ${({ theme }) => theme.mobile}) {
      width: 100%;
    }
  a {
    font-size: 2rem;
    display: block;
    text-transform: uppercase;
    padding: 1rem 0;
    font-weight: bold;
    letter-spacing: 0.5rem;
    color: ${({ theme }) => theme.primaryLight};
    text-decoration: none;
    transition: color 0.3s linear;
    @media (max-width: ${({ theme }) => theme.mobile}) {
      font-size: 1.5rem;
      text-align: center;
    }
    &:hover {
      color: #a52b44;
    }
  }
  img {
    display: flex;
    margin-left: auto;
    margin-right: auto;
    width: 10rem;
    height: 10rem;
  }
  div.logo {
    font-size: 2rem;
    font-weight: bold;
    width: 267px;
    display: block;
    letter-spacing: 0.5rem;
    margin-left: auto;
    margin-right: auto;
    padding-bottom: 1rem;
    color: ${({ theme }) => theme.primaryLight};
  }
`;

const Menu = ({ state, dispatch, removeCookie, ...props }) => {

    const viewHeight = window.outerHeight;
    const path = window.location.pathname;

    const [showSearch, setShowSearch] = useState(path.includes("search") ? true : false);

    useEffect(() => {
       document.title = "Shelterly";
       setShowSearch(path.includes("search"));
    }, [path]);

    return (
    <StyledMenu  {...props} className="flex-column" style={{ height: viewHeight, minHeight:"880px" }}>
    <Link href="/"><img src="/static/images/shelterly.png" alt="Logo" /></Link>
    <div className="logo border-bottom text-center">SHELTERLY</div>
      <Link href="/hotline" className="rounded sidebar" style={{backgroundColor:path.includes("hotline") && !path.includes("search") ? "#444444" : "#292b2c", marginLeft:"-23px", marginRight:"-23px"}}><FontAwesomeIcon icon={faPhone} fixedWidth inverse className="sidebar-icon" style={{marginLeft:"23px"}} /> HOTLINE</Link>
      <Link href="/dispatch" className="rounded sidebar" style={{backgroundColor:path.includes("dispatch") && !path.includes("search") ? "#444444" : "#292b2c", marginLeft:"-23px", marginRight:"-23px"}}><FontAwesomeIcon icon={faBullhorn} fixedWidth inverse className="sidebar-icon" style={{marginLeft:"23px"}} />  DISPATCH</Link>
      <Link href="/shelter" className="rounded sidebar" style={{backgroundColor:path.includes("shelter") ? "#444444" : "#292b2c", marginLeft:"-23px", marginRight:"-23px"}}><FontAwesomeIcon icon={faHome} fixedWidth inverse className="sidebar-icon" style={{marginLeft:"23px"}} /> SHELTER</Link>
      <Link href="" className="rounded sidebar" onClick={() => setShowSearch(!showSearch)}><FontAwesomeIcon icon={faSearch} className="sidebar-icon" fixedWidth inverse/> SEARCH<FontAwesomeIcon icon={showSearch ? faChevronUp : faChevronDown} size="sm" className="fa-move-up sidebar-icon" fixedWidth inverse /></Link>
      <Collapse in={showSearch}>
        <ListGroup variant="flush" style={{marignLeft:"20px", marginTop:"-15px"}}>
          <ListGroup.Item action href="" className="rounded sidebar" onClick={() => navigate('/animals/search')} style={{backgroundColor:path.includes("animals/search") ? "#444444" : "#292b2c"}}><FontAwesomeIcon className="mr-1 sidebar-icon" icon={faSearch} fixedWidth inverse/><span className="sidebar-icon">ANIMALS</span></ListGroup.Item>
          <ListGroup.Item action className="rounded sidebar" onClick={() => navigate('/people/owner/search')} style={{backgroundColor:path.includes("people/owner/search") ? "#444444" : "#292b2c"}}><FontAwesomeIcon className="mr-1 sidebar-icon" icon={faSearch} fixedWidth inverse/><span className="sidebar-icon">OWNERS</span></ListGroup.Item>
          <ListGroup.Item action className="rounded sidebar" onClick={() => navigate('/hotline/servicerequest/search')} style={{backgroundColor:path.includes("hotline/servicerequest/search") ? "#444444" : "#292b2c"}}><FontAwesomeIcon className="mr-1 sidebar-icon" icon={faSearch} fixedWidth inverse/><span className="sidebar-icon">SERVICE REQUESTS</span></ListGroup.Item>
          <ListGroup.Item action className="rounded sidebar" onClick={() => navigate('/dispatch/dispatchassignment/search')} style={{backgroundColor:path.includes("dispatch/dispatchassignment/search") ? "#444444" : "#292b2c"}}><FontAwesomeIcon className="mr-1 sidebar-icon" icon={faSearch} fixedWidth inverse/><span className="sidebar-icon">DISPATCH ASSIGNMENTS</span></ListGroup.Item>
        </ListGroup>
      </Collapse>
      {state.user ? <Link onClick={() => logoutUser({dispatch}, {removeCookie})} href="#" className="rounded sidebar"><FontAwesomeIcon icon={faSignOutAlt} className="sidebar-icon" fixedWidth inverse/> SIGN OUT</Link> : ""}
    </StyledMenu>
    )
  }

function Sidebar({ state, dispatch, removeCookie }) {
    
    const node = useRef();
    const menuId = "main-menu";

    return (
      <div ref={node}>
          <Menu id={menuId} state={state} dispatch={dispatch} removeCookie={removeCookie} />
      </div>
    )
}
export default Sidebar;
