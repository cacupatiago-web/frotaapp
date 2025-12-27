import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Button, Table, Modal } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { QuestionCircleOutlined } from '@ant-design/icons';

interface User {
  id: number;
  name: string;
  email: string;
}

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deleteConfirmationVisible, setDeleteConfirmationVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get('https://jsonplaceholder.typicode.com/users');
        setUsers(response.data);
        setLoading(false);
      } catch (e: any) {
        setError(e.message);
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleEdit = (user: User) => {
    navigate(`/edit/${user.id}`, { state: { user } });
  };

  const showDeleteConfirm = (user: User) => {
    setSelectedUser(user);
    setDeleteConfirmationVisible(true);
  };

  const handleDelete = async () => {
    setDeleteConfirmationVisible(false);
    if (selectedUser) {
     try {
        await axios.delete(`https://jsonplaceholder.typicode.com/users/${selectedUser.id}`);
        setUsers(users.filter(user => user.id !== selectedUser.id));
        setSelectedUser(null);
      } catch (error: any) {
        console.error("Error deleting user:", error);
      }
    };
  };

  const handleCancelDelete = () => {
    setDeleteConfirmationVisible(false);
    setSelectedUser(null);
  };

  const columns: ColumnsType<User> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Action',
      key: 'action',
      render: (text: string, user: User) => (
        <>
          <Button type="primary" onClick={() => handleEdit(user)}>Edit</Button>
          <Button type="danger" onClick={() => showDeleteConfirm(user)} style={{ marginLeft: 8 }}>
            Delete
          </Button>
        </>
      ),
    },
  ];

  if (loading) {
    return <div>Loading users...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Admin Dashboard</h1>
      <Table dataSource={users} columns={columns} rowKey="id" />

      <Modal
        title="Confirm Delete"
        visible={deleteConfirmationVisible}
        onOk={handleDelete}
        onCancel={handleCancelDelete}
        okText="Delete"
        cancelText="Cancel"
      >
        <p>Are you sure you want to delete user {selectedUser?.name}?</p>
      </Modal>
    </div>
  );
};

export default AdminDashboard;
