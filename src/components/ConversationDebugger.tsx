import React from 'react';
import { useChatHistory } from '../hooks/useChatHistory';

const ConversationDebugger: React.FC = () => {
  const { conversationId, messages, isLoading, switchConversation } = useChatHistory();

  const testSwitch = async (convId: string) => {await switchConversation(convId);
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#1a1a1a', color: 'white' }}>
      <h2>Conversation Debugger</h2>
      <div>
        <strong>Current Conversation ID:</strong> {conversationId || 'None'}
      </div>
      <div>
        <strong>Messages Count:</strong> {messages.length}
      </div>
      <div>
        <strong>Is Loading:</strong> {isLoading ? 'Yes' : 'No'}
      </div>
      <div>
        <strong>Messages:</strong>
        <ul>
          {messages.map((msg, index) => (
            <li key={msg.id}>
              {index + 1}. [{msg.role}] {msg.content.substring(0, 50)}...
            </li>
          ))}
        </ul>
      </div>
      <div>
        <button onClick={() => testSwitch('conv_1')}>Switch to Conv 1</button>
        <button onClick={() => testSwitch('conv_2')}>Switch to Conv 2</button>
        <button onClick={() => testSwitch('conv_3')}>Switch to Conv 3</button>
      </div>
    </div>
  );
};

export default ConversationDebugger;
