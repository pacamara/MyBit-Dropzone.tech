/*
 * Create New Airdrop Page
 *
 * Page to create airdrops
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  Helmet
} from 'react-helmet';
import styled from 'styled-components';
import ContainerCreate from 'components/ContainerCreate';
import Image from '../../images/secure.svg';
import Input from 'components/Input';
import H1 from 'components/H1';
import P from 'components/P';
import Web3 from '../../utils/core';
import Constants from 'components/Constants';
import Checkbox from 'antd/lib/checkbox';
import LoadingIndicator from 'components/LoadingIndicator';
import ConnectionStatus from 'components/ConnectionStatus';
import Select from 'react-select'
import topHundredEthAddresses from './topHundredEthAddresses.js';

import 'antd/lib/checkbox/style/css';

const StyledTermsAndConditions = styled.s `
  font-size: 12px;
  font-family: 'Roboto';
  margin-bottom: 10px;
  text-decoration: none;

  a{
    color: #1890ff;
  }
`;

const StyledClickHere = styled.s `
  color: #1890ff;
  text-decoration: underline;
`;

const StyledTermsAndConditionsWrapper = styled.div `
  margin-bottom: 10px;
`;

export default class CreateNewPage extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      shouldConfirm: false,
      isLoading: false,
      acceptedToS: false,
      selectedRecipient: '',
    }
    this.details = [];
    this.handleConfirm = this.handleConfirm.bind(this);
    this.handleBack = this.handleBack.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleAlertClosed = this.handleAlertClosed.bind(this);
  }

  handleClose() {
    this.setState({
      shouldConfirm: false,
      freeTextRecipient: '',
      amountToken: '',
    })
  }

  handleBack() {
    this.setState({
      shouldConfirm: false
    })
  }

  async handleConfirm() {
    const {
      freeTextRecipient,
      amountToken
    } = this.state;

    let alertType = undefined;
    let alertMessage = undefined;
    this.setState({
      alertType
    })

    if (this.props.user.myBitBalance < 250) {
      alertMessage = < span > Your MYB balance is below 250, click < StyledClickHere onClick = {
        () => BancorConvertWidget.showConvertPopup('buy')
      } > here < /StyledClickHere> to buy more.</span >
    } else if (null != freeTextRecipient && !Web3.utils.isAddress(freeTextRecipient)) {
      alertMessage = "Please enter a valid Ethereum address.";
    } else if (!amountToken || amountToken == 0) {
      alertMessage = "Amount of MYB needs to be higher than zero.";
    }

    if (alertMessage) {
      alertType = 'error';
      this.setState({
        alertType,
        alertMessage
      })
      return;
    }

    var displayRecipient;
    if (this.state.selectedRecipient.value === 'top-100') {
      displayRecipient = "Top 100 ETH addresses";
    } else if (this.state.selectedRecipient != '') {
      displayRecipient = Constants.functions.shortenAddress(this.state.selectedRecipient.value);
    } else {
      displayRecipient = Constants.functions.shortenAddress(freeTextRecipient);
    }

    //generate details
    this.details = [];
    this.details.push({
      title: 'Recipient',
      content: [displayRecipient + "."]
    }, {
      title: 'Amount per recipient',
      content: [amountToken + " MYB"]
    })

    this.setState({
      shouldConfirm: true
    })
    this.setState({
      alertType: 'info',
      alertMessage: "Waiting for confirmations."
    });

    console.log("hererere")

    var recipients;
    if (this.state.selectedRecipient.value === 'top-100') {
      recipients = topHundredEthAddresses(this.props.network).map(function(addr) {
        return addr.value
      }).slice(1);
    }
    else if (this.state.selectedRecipient.value != null) {
      recipients = [this.state.selectedRecipient.value];
    }
    else {
      recipients = [freeTextRecipient];
    }

    try {
      let result = true;
      if (!this.props.userAllowed) {
        result = await this.props.requestApproval(recipients.length, amountToken);
      }

      console.log(result)

      if (result) {
        thePromise = this.props.createAirdrop(
          recipients,
          amountToken
          //false,
        );

        result = await thePromise;
      }
      if (result) {
        this.setState({
          alertType: 'success',
          alertMessage: "Transaction confirmed."
        });
      } else {
        this.setState({
          alertType: 'error',
          alertMessage: "Transaction failed. Please try again with more gas."
        });
      }
      this.props.checkAddressAllowed();
      this.props.getTransactions();
    } catch (err) {
      this.setState({
        alertType: undefined
      });
    }
  }

  handleAlertClosed() {
    this.setState({
      alertType: undefined
    })
  }

  handleInputChange(text, id) {
    this.setState({
      [id]: text,
    })
  }

  handleManualRecipientChange(text) {
    this.setState({
      selectedRecipient: '',
      freeTextRecipient: text,
    })
  }

  handleSelectedRecipientChange(option) {
    this.setState({
      selectedRecipient: option,
      freeTextRecipient: null,
    })
  }

  render() {
    let toRender = [];
    //if(this.props.loading){
    //  return <LoadingIndicator />
    //}

    toRender.push( <
      ConnectionStatus network = {
        this.props.network
      }
      constants = {
        Constants
      }
      key = {
        "connection status"
      }
      loading = {
        this.props.loadingNetwork
      }
      />
    )

    const OrParagraph = styled.div `
      color: #2BA7F4;
      margin-top: 0px;
      text-align: center;
    `;

    const selectStyles = {
      option: (provided, state) => ({
        ...provided,
        backgroundColor: 'white',
        color: state.isSelected ? 'red' : 'blue',
      }),
    }

    const content = ( <
      div key = "content" >
      <
      Input placeholder = "Amount in MYB"
      type = "number"
      value = {
        this.state.amountToken
      }
      onChange = {
        (number) => this.handleInputChange(number, 'amountToken')
      }
      min = {
        0
      }
      /> <
      Input placeholder = "Recipient"
      value = {
        this.state.freeTextRecipient
      }
      onChange = {
        (e) => this.handleManualRecipientChange(e.target.value)
      }
      tooltipTitle = "Who will recieve your funds on execution?"
      hasTooltip /
      >
      <
      OrParagraph >
      <
      P > or < /P> <
      /OrParagraph>

      <
      P >
      <
      Select options = {
        topHundredEthAddresses(this.props.network)
      }
      styles = {
        selectStyles
      }
      onChange = {
        (e) => this.handleSelectedRecipientChange(e)
      }
      value = {
        this.state.selectedRecipient
      }
      />		 <
      /P> <
      /div>
    )

    if (this.state.shouldConfirm) {
      toRender.push( <
        ContainerCreate key = "containerConfirm"
        type = "confirm"
        handleClose = {
          this.handleClose
        }
        handleBack = {
          this.handleBack
        }
        alertType = {
          this.state.alertType
        }
        alertMessage = {
          this.state.alertMessage
        }
        handleAlertClosed = {
          this.handleAlertClosed
        }
        details = {
          this.details
        }
        />
      )
    } else {
      toRender.push( <
        ContainerCreate key = "containerCreate"
        type = "input"
        image = {
          Image
        }
        alt = "Placeholder image"
        content = {
          content
        }
        handleConfirm = {
          this.handleConfirm
        }
        alertType = {
          this.state.alertType
        }
        alertMessage = {
          this.state.alertMessage
        }
        handleAlertClosed = {
          this.handleAlertClosed
        }
        acceptedToS = {
          this.state.selectedRecipient != '' || (this.state.freeTextRecipient != null && this.state.freeTextRecipient != '')
        }
        buttonLabel = "Airdrop MyBit (MYB)" /
        >
      )
    }

    return ( <
      article >
      <
      Helmet >
      <
      title > Create - MyBit Dropzone < /title> <
      meta name = "Create"
      content = "Create an airdrop via the MyBit Dropzone dApp" /
      >
      <
      /Helmet> {
        toRender
      } <
      /article>
    );
  }
}

CreateNewPage.defaultProps = {
  userAllowed: false,
};

CreateNewPage.propTypes = {
  userAllowed: PropTypes.bool.isRequired,
  user: PropTypes.shape({
    myBitBalance: PropTypes.number.isRequired,
  }).isRequired,
  loading: PropTypes.bool.isRequired,
  network: PropTypes.string.isRequired,
  loadingNetwork: PropTypes.bool.isRequired,
};
