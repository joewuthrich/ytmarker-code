var stripe = Stripe('pk_live_51IGdVQG7d9GmhCkU01KhVSUcaOZjWNoeAhGSApx2dDx83WfGuzt27aetEpyIEbdFqDok4wB2NkzjOsF12l5UtXzk00ZgEk2M4v');

var createCheckoutSession = function(priceId) {
    return fetch("/create-checkout-session", {
      method: "POST",
    }).then(function(result) {
      return result.json();
    });
  };

document
  .getElementById("checkout")
  .addEventListener("click", function(evt) {
    createCheckoutSession().then(function(data) {
      // Call Stripe.js method to redirect to the new Checkout page
      stripe
        .redirectToCheckout({
          sessionId: data.sessionId
        })
        .then(handleResult);
    });
  });