import { BACKEND_BASE_URL} from "../constants"


function getLoginData() {
  if (JSON.parse(localStorage.getItem("remember-me")) ? true : false) {
    return JSON.parse(localStorage.getItem("login-data"))
  } else {
    return JSON.parse(sessionStorage.getItem("login-data"))
  }
}

export const fetchSubscriptions = async (data) => {

  const queryParams = new URLSearchParams(data).toString();
  const response = await fetch(`${BACKEND_BASE_URL}/subscriptions?${queryParams}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Auth-Token': getLoginData()
    },
  });
  if (!response.ok) {
    throw new Error(`Error: ${response.status}`);
  }
  return await response.json();
};


export const createSubscription = async (data) => {

    const queryParams = new URLSearchParams(data).toString();
    const response = await fetch(`${BACKEND_BASE_URL}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Auth-Token': getLoginData()
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    return await response;
};
  
export const deleteSubscription = async (data) => {

    const queryParams = new URLSearchParams(data).toString();
    const response = await fetch(`${BACKEND_BASE_URL}/subscriptions`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Auth-Token': getLoginData()
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    return await response;
};

export const deleteSubscriptionWT = async (data) => {

  const queryParams = new URLSearchParams(data).toString();
  const response = await fetch(`${BACKEND_BASE_URL}/unsubscribe`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Error: ${response.status}`);
  }
  return await response;
};

