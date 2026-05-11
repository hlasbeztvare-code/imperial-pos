package com.gasaan.pos.bridge;

import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.hardware.usb.UsbConstants;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbDeviceConnection;
import android.hardware.usb.UsbEndpoint;
import android.hardware.usb.UsbInterface;
import android.hardware.usb.UsbManager;
import android.util.Log;

import java.util.HashMap;

/**
 * Handles USB Hardware communication for ESC/POS Printers.
 */
public class UsbHardwareManager {
    private static final String TAG = "UsbHardwareManager";
    private static final String ACTION_USB_PERMISSION = "com.gasaan.pos.USB_PERMISSION";

    private Context mContext;
    private UsbManager mUsbManager;
    private UsbDevice mDevice;
    private UsbDeviceConnection mConnection;
    private UsbEndpoint mEndpointOut;

    public UsbHardwareManager(Context context) {
        this.mContext = context;
        this.mUsbManager = (UsbManager) context.getSystemService(Context.USB_SERVICE);
        initConnection();
    }

    public void initConnection() {
        Log.d(TAG, "Initializing USB connection...");
        HashMap<String, UsbDevice> deviceList = mUsbManager.getDeviceList();
        
        if (deviceList.isEmpty()) {
            Log.e(TAG, "No USB devices found. Check cables!");
            return;
        }

        for (UsbDevice device : deviceList.values()) {
            // Try to connect to any device that looks like a printer or has bulk endpoints
            Log.d(TAG, "Found device: " + device.getDeviceName() + " (VID: " + device.getVendorId() + ")");
            if (tryConnect(device)) {
                mDevice = device;
                Log.i(TAG, "SUCCESS: Hardware Bridge Active on " + device.getDeviceName());
                return;
            }
        }
        
        Log.e(TAG, "CRITICAL: Connection failed. Drawer will not fire today.");
    }

    private boolean tryConnect(UsbDevice device) {
        UsbInterface usbInterface = device.getInterface(0);
        for (int i = 0; i < usbInterface.getEndpointCount(); i++) {
            UsbEndpoint endpoint = usbInterface.getEndpoint(i);
            if (endpoint.getType() == UsbConstants.USB_ENDPOINT_XFER_BULK &&
                endpoint.getDirection() == UsbConstants.USB_DIR_OUT) {
                
                if (!mUsbManager.hasPermission(device)) {
                    requestPermission(device);
                    return false;
                }
                
                mConnection = mUsbManager.openDevice(device);
                if (mConnection != null && mConnection.claimInterface(usbInterface, true)) {
                    mEndpointOut = endpoint;
                    Log.i(TAG, "Connected to " + device.getDeviceName());
                    return true;
                }
            }
        }
        return false;
    }

    private void requestPermission(UsbDevice device) {
        PendingIntent permissionIntent = PendingIntent.getBroadcast(mContext, 0, new Intent(ACTION_USB_PERMISSION), PendingIntent.FLAG_IMMUTABLE);
        mUsbManager.requestPermission(device, permissionIntent);
    }

    public void sendData(byte[] data) throws Exception {
        if (mConnection == null || mEndpointOut == null) {
            throw new Exception("Printer not connected");
        }
        
        int result = mConnection.bulkTransfer(mEndpointOut, data, data.length, 5000);
        if (result < 0) {
            throw new Exception("Bulk transfer failed: " + result);
        }
        Log.d(TAG, "Sent " + result + " bytes to hardware");
    }

    public boolean isConnected() {
        return mConnection != null && mEndpointOut != null;
    }
    
    public void close() {
        if (mConnection != null) {
            mConnection.close();
            mConnection = null;
        }
        mEndpointOut = null;
        mDevice = null;
    }

    public void reconnect() {
        close();
        initConnection();
    }
}
