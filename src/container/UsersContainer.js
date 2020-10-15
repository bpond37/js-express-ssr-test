import React, { useEffect } from 'react'
import Users from '../components/Users'
import { connect } from 'react-redux';
import { getUsers } from '../modules/users'
import { Preloader } from '../lib/PreloadContext'

const UsersContainer = ({users, getUsers }) =>{
  //컴포넌트가 마운트 되고나서 호출
  useEffect(()=>{
    if (users) return;
    getUsers();
  }, [getUsers, users]);
  return (
    <>
      <Users users={users} />
      <Preloader resolve={getUsers} />
    </>
  )
  
}

export default connect(
  state => ({
    users: state.users.users
  }),
  {
    getUsers
  }
)(UsersContainer)