import React from 'react';
import Avatar from 'react-avatar';

const Client = ({ username }) => {
    return (
        <div className="client-item">
            <div className="client-avatar">
                {username.charAt(0).toUpperCase()}
            </div>
            <div className="client-info">
                <span className="client-name">{username}</span>
            </div>
            <div className="client-status" title="Online"></div>
        </div>
    );
};

export default Client;