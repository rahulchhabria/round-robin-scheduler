import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Chip,
  Paper
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import moment from 'moment';
import { meetingAPI } from '../utils/api';

const BookingPage = () => {
  const [selectedDate, setSelectedDate] = useState(moment().add(1, 'day'));
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bookingData, setBookingData] = useState({
    customerName: '',
    customerEmail: '',
    title: '',
    description: ''
  });
  const [message, setMessage] = useState(null);
  const [step, setStep] = useState(1); // 1: Select date, 2: Select time, 3: Fill details, 4: Confirm

  useEffect(() => {
    if (selectedDate && step >= 2) {
      loadAvailableSlots();
    }
  }, [selectedDate]);

  const loadAvailableSlots = async () => {
    setLoading(true);
    try {
      const response = await meetingAPI.getAvailableSlots(selectedDate.format('YYYY-MM-DD'));
      setAvailableSlots(response.data.slots || []);
    } catch (error) {
      console.error('Error loading slots:', error);
      setMessage({ type: 'error', text: 'Failed to load available time slots' });
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date) => {
    if (date && date.isAfter(moment())) {
      setSelectedDate(date);
      setSelectedSlot(null);
      setStep(2);
    }
  };

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
    setStep(3);
  };

  const handleInputChange = (field) => (event) => {
    setBookingData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleBooking = async () => {
    if (!bookingData.customerName || !bookingData.customerEmail || !bookingData.title) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    setLoading(true);
    try {
      const response = await meetingAPI.bookMeeting({
        ...bookingData,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime
      });

      setMessage({ 
        type: 'success', 
        text: response.data.message || 'Meeting booked successfully!' 
      });
      
      // Reset form
      setStep(1);
      setSelectedDate(moment().add(1, 'day'));
      setSelectedSlot(null);
      setBookingData({
        customerName: '',
        customerEmail: '',
        title: '',
        description: ''
      });
    } catch (error) {
      console.error('Booking error:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to book meeting' 
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateTime) => {
    return moment(dateTime).format('h:mm A');
  };

  const isWeekend = (date) => {
    const day = date.day();
    return day === 0 || day === 6; // Sunday or Saturday
  };

  return (
    <LocalizationProvider dateAdapter={AdapterMoment}>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Book a Meeting
        </Typography>

        {message && (
          <Alert 
            severity={message.type} 
            sx={{ mb: 3 }}
            onClose={() => setMessage(null)}
          >
            {message.text}
          </Alert>
        )}

        <Grid container spacing={4}>
          {/* Step 1: Date Selection */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  1. Select Date
                </Typography>
                <DatePicker
                  label="Meeting Date"
                  value={selectedDate}
                  onChange={handleDateSelect}
                  minDate={moment().add(1, 'day')}
                  shouldDisableDate={isWeekend}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Step 2: Time Selection */}
          {step >= 2 && (
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    2. Select Time
                  </Typography>
                  {loading ? (
                    <Box display="flex" justifyContent="center" p={2}>
                      <CircularProgress />
                    </Box>
                  ) : availableSlots.length > 0 ? (
                    <Box>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        Available slots for {selectedDate.format('MMMM D, YYYY')}:
                      </Typography>
                      <Grid container spacing={1}>
                        {availableSlots.map((slot, index) => (
                          <Grid item key={index}>
                            <Chip
                              label={`${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`}
                              onClick={() => handleSlotSelect(slot)}
                              color={selectedSlot === slot ? 'primary' : 'default'}
                              variant={selectedSlot === slot ? 'filled' : 'outlined'}
                              clickable
                            />
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  ) : (
                    <Typography color="textSecondary">
                      No available slots for this date
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>

        {/* Step 3: Meeting Details */}
        {step >= 3 && selectedSlot && (
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                3. Meeting Details
              </Typography>
              
              <Paper sx={{ p: 2, mb: 3, backgroundColor: 'primary.light', color: 'white' }}>
                <Typography variant="body1">
                  <strong>Selected Time:</strong> {selectedDate.format('MMMM D, YYYY')} at {formatTime(selectedSlot.startTime)} - {formatTime(selectedSlot.endTime)}
                </Typography>
              </Paper>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label="Your Name"
                    value={bookingData.customerName}
                    onChange={handleInputChange('customerName')}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    type="email"
                    label="Email Address"
                    value={bookingData.customerEmail}
                    onChange={handleInputChange('customerEmail')}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    required
                    label="Meeting Title"
                    placeholder="e.g., Product Demo, Consultation Call"
                    value={bookingData.title}
                    onChange={handleInputChange('title')}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Meeting Description (Optional)"
                    placeholder="Please provide any additional details about what you'd like to discuss..."
                    value={bookingData.description}
                    onChange={handleInputChange('description')}
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => setStep(2)}
                >
                  Back
                </Button>
                <Button
                  variant="contained"
                  onClick={handleBooking}
                  disabled={loading || !bookingData.customerName || !bookingData.customerEmail || !bookingData.title}
                >
                  {loading ? <CircularProgress size={20} /> : 'Book Meeting'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default BookingPage;