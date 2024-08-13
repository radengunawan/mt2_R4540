puts  "MT2 STC Proxy v1.0"

set PORT_NUMBER   4000


package forget  SpirentTestCenter
package require SpirentTestCenter

# Procedure that read a line with quoted and unquoted strings
#
proc qscan { data format args } {
  set data_list   [regexp -inline -all {[^ "]+|"[^"]*"|'[^']*'} $data]
  set format_list [split $format]
  set nb 0
  foreach form $format_list arg $args datum $data_list {
    if { $form == "" || $arg == "" } {
      break
    } else {
      upvar $arg var
      if { [string index $datum 0] != "\"" && [string index $datum 0] != "'"   } {
        set nb [expr $nb + [scan $datum $form var]]
      } else {
        set var [string range $datum 1 end-1]
        set nb [expr $nb + 1]
      }
    }
  }
  return nb
}

# New client connection handler
proc newConnection {channel addr port} {
  puts "New connection established from  $addr $port"
  # set up file event to be called when input is available
  fileevent $channel readable "readNewLine $channel"
}

# Called when a new line is available
proc readNewLine {channel} {
  set len [gets $channel line]
  # if we read 0 chars, check for EOF condition. And if EOF is set close the channel and delete that client entry
  if { ($len<=0) && [eof $channel] } {
    puts "Connection closed"
    close $channel
  } else {
    # Process the new line data
    processCommand $channel $line
  }
}

# Called when a new line has been read
proc processCommand {channel line} {
  if {[catch {
    puts [format {%s %s} ":>" $line]
    set command ""
    set arg1 ""
    set arg2 ""
    set arg3 ""
    set arg4 ""
    set arg5 ""
    set nbOfField [qscan $line {%s %s %s %s %s %s} command arg1 arg2 arg3 arg4 arg5]

    # RESET               Reset proxy internal state
    # NEW_PROJECT         Create a project object
    # DEL_PROJECT         Delete a project object
    # NEW_PORT            Create a new port object arg1 is project object to be attached on and arg2 is location (Format is //ChassisIp/Slot/Port)
    # DEL_PORT            Delete a port object arg1 is port object
    # NEW_PHY             Create a new Physical Interface arg1 is port to be attached on
    # CONNECT             Connect to chassis arg1 is chassis ip address
    # DISCONNECT          Disconnect from chassis arg1 is chassis ip address
    # RESERVE             Reserve a port on chassis arg1 is port location (Format is //ChassisIp/Slot/Port)
    # RELEASE             Release a port on chassis arg1 is port location (Format is //ChassisIp/Slot/Port)
    # SETUP_PHY           Setup port mapping
    # APPLY               Apply configuration
    # GET_GENERATOR       Get the generator associated with a port arg1 is port
    # GET_ANALYZER        Get the analyzer associated with a port arg1 is port
    # NEW_FILTER          Create new filter arg1 is analyzer to be associated on arg2 is filter name arg3 is XML frame config
    # NEW_STREAM          Create new stream  arg1 is port to be associated on, arg2 is frame length, arg3 is XML frame config
    # CONFIG_GENERATOR    Config generator object arg1 is generator object arg2 is total nb of frame to send
    # SUBSCRIBE_RESULT    Subscribe to results arg1 is project 
    # SUBSCRIBE_FILTER    Subscribe to filter arg1 is project and arg2 is port on which analyzer is connected
    # START_CAPTURE       Start capture on arg1 port
    # STOP_CAPTURE        Stop capture on arg1 port and save pcap file into arg2 filename
    # START_ANALYZER      Start analyzer on arg1 analyzer
    # STOP_ANALYZER       Stop analyzer on arg1 analyzer
    # START_GENERATOR     Start generator on arg1 generator
    # STOP_GENERATOR      Stop generator on arg1 generator
    # START_STREAM        Start generating a stream (arg1 stream)
    # STOP_STREAM         Stop generating a stream (arg1 stream)
    # GET_STATE           Get current state on arg1 object (analyzer or generator)
    # GET_STAT_SIG_RX     Get Signature Statistic on arg1 analyzer
    # GET_STAT_TOTAL_RX   Get Total frame count Statistic on arg1 analyzer
    # GET_STAT_SIG_TX     Get sent Signature Statistic on arg1 analyzer
    # GET_STAT_TOTAL_TX   Get Total sent frame count Statistic on arg1 analyzer
    # GET_STAT_RX_STREAM  Get Total sent frame count Statistic on arg1 analyzer
    # GET_STAT_TX_STREAM  Get Total sent frame count Statistic on arg1 analyzer
    # GET_STAT_FILTER     Get Filter statistics on arg1 port (return string array)
    # REFRESH_RESULT      Refresh result of handle
    # ACTIVATE_STREAM     Activate the stream in arg1
    # DEACTIVATE_STREAM   Deactivate the stream in arg1
    # DEL_HANDLE          Delete handle arg1
    # SEND_FRAME          Send a frame on arg1 port (frame is arg2 length arg3 nb of repeat, arg4 hex string array and arg5 is frame pcap header)
    # CLEAR_STAT_PORT     Clear stat on port arg1
    
    switch -glob $command {
      "RESET"               { puts $channel [reset] }
      "NEW_PROJECT"         { puts $channel [new_project] }       
      "DEL_PROJECT"         { puts $channel [del_project $arg1] }
      "NEW_PORT"            { puts $channel [new_port $arg1 $arg2] }
      "DEL_PORT"            { puts $channel [del_port $arg1] }
      "NEW_PHY"             { puts $channel [new_phy $arg1] }
      "GET_PHY_SPEED"       { puts $channel [get_phy_speed $arg1] }
      "CONNECT"             { puts $channel [connect $arg1] }
      "DISCONNECT"          { puts $channel [disconnect $arg1] }
      "RESERVE"             { puts $channel [reserve $arg1] }
      "RELEASE"             { puts $channel [release $arg1] }
      "SETUP_PHY"           { puts $channel [setup_port_mapping] }
      "APPLY"               { puts $channel [apply] }
      "GET_GENERATOR"       { puts $channel [get_generator $arg1] }
      "GET_ANALYZER"        { puts $channel [get_analyzer $arg1] }
      "NEW_FILTER"          { puts $channel [new_filter $arg1 $arg2 $arg3] }
      "NEW_STREAM"          { puts $channel [new_stream $arg1 $arg2 $arg3] }
      "CONFIG_GENERATOR"    { puts $channel [config_generator $arg1 $arg2 $arg3] }
      "SUBSCRIBE_RESULT"    { puts $channel [subscribe_to_results $arg1] }
      "SUBSCRIBE_FILTER"    { puts $channel [subscribe_to_filters  $arg1 $arg2] }
      "START_CAPTURE"       { puts $channel [start_capture $arg1 ] }
      "STOP_CAPTURE"        { puts $channel [stop_capture $arg1 $arg2 ] }
      "START_ANALYZER"      { puts $channel [start_analyzer $arg1 ] }
      "STOP_ANALYZER"       { puts $channel [stop_analyzer $arg1 ] }
      "START_GENERATOR"     { puts $channel [start_generator $arg1 ] }
      "STOP_GENERATOR"      { puts $channel [stop_generator $arg1 ] }
      "START_STREAM"        { puts $channel [start_stream $arg1 ] }
      "STOP_STREAM"         { puts $channel [stop_stream $arg1 ] }
      "GET_STATE"           { puts $channel [get_state $arg1 ] }
      "GET_STAT_SIG_RX"     { puts $channel [get_rx_sig_stat $arg1 ] }
      "GET_STAT_TOTAL_RX"   { puts $channel [get_rx_total_stat $arg1 ] }
      "GET_STAT_SIG_TX"     { puts $channel [get_tx_sig_stat $arg1 ] }
      "GET_STAT_TOTAL_TX"   { puts $channel [get_tx_total_stat $arg1 ] }
      "GET_STAT_FILTER"     { puts $channel [get_filter_stat $arg1 ] }
      "GET_STAT_IDX"        { puts $channel [get_filter_stat_idx $arg1 $arg2 ] }
      "GET_STAT_RX_STREAM"  { puts $channel [get_stat_rx_stream $arg1 ] }
      "GET_STAT_TX_STREAM"  { puts $channel [get_stat_tx_stream $arg1 ] }
      "REFRESH_RESULT"      { puts $channel [refresh_result $arg1] }
      "ACTIVATE_STREAM"     { puts $channel [activate_stream $arg1] }
      "DEACTIVATE_STREAM"   { puts $channel [deactivate_stream $arg1] }
      "DEL_HANDLE"          { puts $channel [del_handle $arg1] }
      "SEND_FRAME"          { puts $channel [send_frame $arg1 $arg2 $arg3 $arg4 $arg5] }
      "CLEAR_STAT_PORT"     { puts $channel [clear_stat_port $arg1] }
      "CREATE_RANGE_MODIFIER"  { puts $channel [create_range_modifier $arg1 $arg2 $arg3 $arg4 $arg5] }
			"SET_RANGE_MODIFIER"  { puts $channel [set_range_modifier $arg1 $arg2 $arg3 $arg4 $arg5] }
      "SET_STREAM_RATE"     { puts $channel [set_stream_rate $arg1 $arg2] }
      default               { puts $channel "ERROR: INVALID COMMAND $command" }
    }
    flush $channel
  } err] } {
    puts "Error caught: $err"
    puts $channel "ERROR: $err"
  }
}


# ############################
# Spirent Test Center commands
# ############################
proc reset {} {
  puts "Reseting"
  set result1 [ stc::perform ChassisDisconnectAll ]
  set result2 [ stc::perform ResetConfig -config system1 ]
  puts "Result: $result1/$result2"
  return "OK"
}

proc new_project {} {
  puts "Creating project"
  return [stc::create project]
}

proc del_project { project } {
  puts "Deleting project $project"
  stc::delete $project
  return "OK"
}

proc new_port { project port_location } {
  puts "Creating port under $project location $port_location"	
  return [stc::create port -under $project -location $port_location -useDefaultHost False ]
}

proc del_port { port } {
  puts "Deleting port $port"	
  stc::delete $port
  return "OK"
}

proc new_phy  { port } {
  puts "Creating PHY on port $port"	
  set res [stc::create EthernetCopper -under $port]
  set supported_speeds [stc::get $res -SupportedSpeeds]
  set line_speed [stc::get $res -LineSpeedStatus]
  set link_status [stc::get $res -LinkStatus]
  puts "Physical port $port:"
  puts "\tSupported Speed: $supported_speeds"
  puts "\tLine Speed: $line_speed"
  puts "\tLink Status: $link_status"
  return $res
}

proc get_phy_speed { port } {
  set supported_speeds [stc::get $port -SupportedSpeeds]
  set line_speed [stc::get $port -LineSpeedStatus]
  set link_status [stc::get $port -LinkStatus]
  puts "Physical port $port:"
  puts "\tSupported Speed: $supported_speeds"
  puts "\tLine Speed: $line_speed"
  puts "\tLink Status: $link_status"
  return $line_speed
}

proc connect  { chassis_ip } {
  puts "Connecting $chassis_ip"	
  stc::connect $chassis_ip
  return "OK"
}

proc disconnect { chassis_ip } {
  puts "Disconnecting from $chassis_ip"
  stc::disconnect $chassis_ip
  return "OK"
}
	
proc reserve  { port_location } {
  puts "Reserving $port_location"
  stc::reserve "$port_location"
  return "OK"
}

proc release { port_location } {
  puts "Releasing $port_location"
  stc::release "$port_location"
  return "OK"
}

proc setup_port_mapping { } {
  puts "Setting up Port mapping"
  stc::perform SetupPortMappings
  return "OK"
}
  
proc apply {} {
  puts "Applying configuration"
  stc::apply
  return "OK"
}

proc get_generator { port } {
  puts "Getting port $port generator"
  return [stc::get $port -children-Generator]  
}

proc get_analyzer { port } {
  puts "Getting port $port analyzer"
  return [stc::get $port -children-Analyzer]
}

proc del_handle { handle } {
  return [stc::delete $handle]
}

proc new_filter { analyzer name frame_config } {
  puts "Creating new filter"
  set hAnalyzerFrameConfigFilter [stc::create AnalyzerFrameConfigFilter -under $analyzer -FrameConfig ""]
  stc::config $hAnalyzerFrameConfigFilter -FrameConfig $frame_config -Summary $name  
  stc::apply
  puts "FrameConfig attribute"
  puts \t[stc::get $hAnalyzerFrameConfigFilter -FrameConfig]
    
  puts "\nAnalyzerFrameConfigFilter children"
  foreach hChild [stc::get $hAnalyzerFrameConfigFilter -children] {
    puts \n\t$hChild

    # Display the attributes for each child.    
    foreach {szAttribute szName} [stc::get $hChild] {
      puts \t\t$szAttribute\t$szName
    }
  }
  return $hAnalyzerFrameConfigFilter
}

proc new_stream { port frame_len frame_config } {
  puts "Creating new stream block"
  set hFrame1 [stc::create streamBlock -under $port -insertSig true -frameConfig "" -frameLengthMode FIXED -maxFrameLength $frame_len -FixedFrameLength $frame_len]
  stc::config $hFrame1 -FrameConfig $frame_config
  
  puts "FrameConfig attribute"
  puts \t[stc::get $hFrame1 -FrameConfig]
  
  puts "\nFrameConfig children"
  foreach hChild [stc::get $hFrame1 -children] {
    puts \n\t$hChild

    # Display the attributes for each child.    
    foreach {szAttribute szName} [stc::get $hChild] {
      puts \t\t$szAttribute\t$szName
    }
  }
                  
  return $hFrame1
}

proc config_generator { generator nb_of_frame rate } {
  puts "Configuring Generator $generator with total nb of frame $nb_of_frame at rate $rate"
  set hGeneratorConfig [stc::get $generator -children-GeneratorConfig]
  if { $nb_of_frame == 0 && $rate == 0 } {
    stc::config $hGeneratorConfig \
                -BurstSize 1 \
                -DurationMode CONTINUOUS \
                -LoadMode FIXED \
                -SchedulingMode RATE_BASED
  } elseif { $rate == 0 } { 
    stc::config $hGeneratorConfig \
                -BurstSize 1 \
                -DurationMode BURSTS \
                -Duration $nb_of_frame \
                -LoadMode FIXED \
                -SchedulingMode RATE_BASED
  } elseif { $nb_of_frame == 0 } {
    stc::config $hGeneratorConfig \
                -BurstSize 1 \
                -DurationMode CONTINUOUS \
                -LoadMode FIXED \
                -FixedLoad $rate \
                -LoadUnit KILOBITS_PER_SECOND \
                -SchedulingMode PORT_BASED
  } else {
    stc::config $hGeneratorConfig \
                -BurstSize 1 \
                -DurationMode BURSTS \
                -Duration $nb_of_frame \
                -LoadMode FIXED \
                -FixedLoad $rate \
                -LoadUnit KILOBITS_PER_SECOND \
                -SchedulingMode PORT_BASED
  }
  
  return "OK"
}

proc subscribe_to_results { project } {
  puts "Subscribing to results"
  stc::subscribe -Parent $project \
                 -ConfigType Analyzer \
                 -ResultType AnalyzerPortResults \
                 -FileNamePrefix "Analyzer_Port_Results" \
                 -ViewAttributeList "TotalFrameCount SigFrameCount"

  stc::subscribe -Parent $project \
                 -ConfigType Generator \
                 -ResultType GeneratorPortResults  \
                 -FileNamePrefix "Generator_Port_Counter" \
                 -ViewAttributeList "TotalFrameCount GeneratorSigFrameCount" \
                 -Interval 1

  stc::subscribe -Parent [lindex [stc::get system1 -children-Project] 0] \
                 -ResultParent " [lindex [stc::get system1 -children-Project] 0] " \
                 -ConfigType streamblock \
                 -ResultType rxstreamresults \
                 -filterList "" \
                 -viewAttributeList "FrameCount SigFrameCount StreamIndex" \
                 -Interval 1
                 
  #stc::subscribe -Parent [lindex [stc::get system1 -children-Project] 0] \
                -ResultParent " [lindex [stc::get system1 -children-Project] 0] " \
                -ConfigType streamblock \
                -ResultType rxstreamsummaryresults \
                -FileNamePrefix "RX_Stream_summary" \
                -FilterList "[lindex [stc::get system1.Project(1) -children-RxPortResultFilter] 0] " \
                -ViewAttributeList "FrameCount SigFrameCount" \
                -Interval 1 
                 
  #stc::subscribe -Parent [lindex [stc::get system1 -children-Project] 0] \
                 -ResultParent " [lindex [stc::get system1 -children-Project] 0] " \
                 -ConfigType streamblock \
                 -ResultType rxstreamresults \
                 -FilterList "" \
                 -Filenameprefix "RX_Stream" \
                 -ViewAttributeList "FrameCount SigFrameCount" \
                 -Interval 1
                 
  stc::subscribe -Parent [lindex [stc::get system1 -children-Project] 0] \
                 -ResultParent " [lindex [stc::get system1 -children-Project] 0] " \
                 -ConfigType streamblock \
                 -ResultType txstreamresults \
                 -filterList "" \
                 -viewAttributeList "FrameCount StreamId StreamIndex" \
                 -Interval 1
  return "OK"
}

proc subscribe_to_filters { project port_rx } {
  puts "Subscribing to filters"
                 
  stc::subscribe -Parent $project \
                -configType Analyzer \
                -resultParent $port_rx \
                -resultType FilteredStreamResults  \
                -filenamePrefix "FilteredStreamResults_$port_rx" \
                -viewAttributeList "framecount sigframecount" \
                -interval 1
  return "OK"
}


proc start_capture { port_rx } {
  puts "Starting Capture"
  set hCapture [stc::get $::port_rx -children-capture]
  stc::config $hCapture -mode REGULAR_MODE -srcMode TX_RX_MODE  
  stc::perform CaptureStart -captureProxyId $hCapture
  return "OK"
}

proc stop_capture { port_rx filename } {
  puts "Stopping Capture"
  set hCapture [stc::get $::port_rx -children-capture]
  stc::perform CaptureStop -captureProxyId $hCapture
    
  # Save captured frames to a file.
  stc::perform CaptureDataSave -captureProxyId $hCapture -FileName $filename -FileNameFormat PCAP -IsScap FALSE
  return "OK"
}

proc start_analyzer { analyzer } {
  puts "Starting Analyzer"
  stc::perform AnalyzerStart -AnalyzerList $analyzer
  return "OK"
}

proc stop_analyzer { analyzer } {
  puts "Stopping Analyzer"
  stc::perform AnalyzerStop -AnalyzerList $analyzer
  return "OK"
}
    
proc start_generator { generator } {
  puts "Starting Generator $generator"
  stc::perform GeneratorStart -GeneratorList $generator
  return "OK"
}

proc stop_generator { generator } {
  puts "Stopping Generator $generator"
  stc::perform GeneratorStop -GeneratorList $generator
  return "OK"
}

proc start_stream { stream } {
  puts "Starting Stream $stream"
  stc::perform StreamBlockStart -StreamBlockList $stream
  return "OK"
}

proc stop_stream { stream } {
  puts "Stopping Stream $stream"
  stc::perform StreamBlockStop -StreamBlockList $stream
  return "OK"
}

proc get_state { object } {
  puts "Getting state of $object"
  return [stc::get $object -state]
}

proc get_rx_sig_stat { analyzer } {
  puts "Getting RX signature statistics of $analyzer"
  set hAnalyzerResults [stc::get $analyzer -children-AnalyzerPortResults]  
  return [stc::get $hAnalyzerResults -sigFrameCount]
}

proc get_rx_total_stat { analyzer } {
  puts "Getting RX total statistics of $analyzer"
  set hAnalyzerResults [stc::get $analyzer -children-AnalyzerPortResults]  
  return [stc::get $hAnalyzerResults -totalFrameCount]
}

proc get_tx_sig_stat { generator } {
  puts "Getting TX signature statistics of $generator"
  set hGeneratorResults [stc::get $generator -children-GeneratorPortResults]  
  return [stc::get $hGeneratorResults -generatorSigFrameCount]
}

proc get_tx_total_stat { generator } {
  puts "Getting TX total statistics of $generator"
  set hGeneratorResults [stc::get $generator -children-GeneratorPortResults]
  return [stc::get $hGeneratorResults -totalFrameCount]
}

proc get_stat_rx_stream { stream } {
  puts "Getting RX statistics of $stream"
  set hStreamResults [stc::get $stream -children-RxStreamBlockResults]
  return [stc::get $hStreamResults -SigFrameCount]
}

proc get_stat_tx_stream { stream } {
  puts "Getting TX statistics of $stream"
  set hStreamResults [stc::get $stream -children-txstreamresults]  
  return [stc::get $hStreamResults -FrameCount]
}

proc get_filter_stat { port } {
  puts "Getting RX filter statistics of $port"
  # Retrieve the resultChild objects. There will be one handle for each filtered stream entry.
  puts "\n\nFiltered Frame Results:"
  set cResults ""
  set szResults ""
  # Default value is 0
  set value 0
  # Using the -children method to obtain results object handles.  
  foreach hResults [stc::get $port.Analyzer -children-FilteredStreamResults] {
    array set aResults [stc::get $hResults]
    # Get the filtered Names and Values.  This is a nice way to display what unique elements
    #   were tracked.
    set szResults ""
      
    for {set i 1} {$i <= 10} {incr i} {
      if {![string equal $aResults(-FilteredName_$i) ""]} {
        append szResults $aResults(-FilteredName_$i) ":$aResults(-FilteredValue_$i) "
      } else {
        break
      }
    }
    
    append szResults \t$aResults(-FrameCount)
    puts \t$szResults
    set value $aResults(-FrameCount)
  }
  return $value;
}

proc get_filter_stat_idx { port stream } {
  puts "Getting RX filter statistics of $port:$stream"
  # Retrieve the stream index
  set frame_idx [stc::get $stream -StreamBlockIndex]
  puts "Stream index of $stream is $frame_idx"
  
  # Retrieve the resultChild objects. There will be one handle for each filtered stream entry.
  puts "\n\nFiltered Frame Results:"
  set cResults ""
  set szResults ""
  # Default value is 0
  set value 0
	# result are not necessarily ordered. must compute the idx
  set idx  0
  # Using the -children method to obtain results object handles.  
  foreach hResults [stc::get $port.Analyzer -children-FilteredStreamResults] {
    array set aResults [stc::get $hResults]
    # Get the filtered Names and Values.  This is a nice way to display what unique elements
    #   were tracked.
    set szResults ""
    for {set i 1} {$i <= 10} {incr i} {
			puts "NAME=$aResults(-FilteredName_$i)"
			puts "VALUE=$aResults(-FilteredValue_$i)"
			if {[string equal $aResults(-FilteredName_$i) ""]} {
				break
			}
      if {[string equal $aResults(-FilteredName_$i) "Rx Stream Id"]} {
        append szResults $aResults(-FilteredName_$i) ":$aResults(-FilteredValue_$i) "
				append szResults \t$aResults(-FrameCount)
				puts \t$szResults
        set idx [expr $aResults(-FilteredValue_$i) % 65536]
				puts "\t\tSearch:$frame_idx current: $idx"
				if { $idx == $frame_idx } {
					puts "Found"
					set value $aResults(-FrameCount)
					# return $value; # do not exit, so that we see everything
					# Note that if a stream is not caught by  a filter, it simply does not appear
				}
				break
      }
    }
    puts "Next"
  }
  return $value;
}

proc refresh_result { handle } {
  puts "Refreshing result of $handle"
  return [stc::perform RefreshResultViewCommand -ResultDataSet $handle]
}

proc activate_stream { stream } {
  puts "Activating stream $stream"
  return [stc::perform StreamBlockActivate -Activate true -StreamBlockList $stream]
}

proc deactivate_stream { stream } {
  puts "Deactivating stream $stream"
  return [stc::perform StreamBlockActivate -Activate false -StreamBlockList $stream]
}

proc send_frame { port len nb hexframe hexframeheader } {
  puts "Sending frame on $port"
  # Create temporary PCAP file
  set file [open "pcap_tmp.pcap" "wb"]
  fconfigure $file -translation binary -encoding binary
  
  # write file header
  puts -nonewline $file [binary format H* D4C3B2A1020004000000000000000000FFFF000001000000]
  
  # write nb frame instance
  for {set i 0} {$i < $nb} {incr i} {
    # write packet header
    puts -nonewline $file [binary format H* $hexframeheader]
    # write frame
    puts -nonewline $file [binary format H* $hexframe]
  }
  # close the file
  close $file
  
  # Create a stream block from the pcap file
  set hTmpSB [stc::perform GenerateStreamBlockFromPcap -PcapFilename "pcap_tmp.pcap" -Port $port]
  puts "Tmp stream block created from PCAP is $hTmpSB"
  
  # Ask STC to send the new stream block
  #stc::perform GeneratorStart -GeneratorList generator1
  #stc::perform StreamBlockStart -StreamBlockList $name
  return "OK"
}

proc clear_stat_port { port } {
  puts "Clearing stat on port $port"
  set res [stc::perform ResultsClearAll -PortList $port]
  return "OK"
}

proc create_range_modifier { stream offset mask method repeat } {
# Use modifier to generate multiple streams.
  puts "Creating Modifier on Stream Block ..."
  set hRangeModifier [stc::create RangeModifier \
          -under $stream \
          -ModifierMode $method \
          -Mask "$mask" \
          -StepValue "0001" \
          -Data "0000" \
          -RecycleCount 65535 \
          -RepeatCount $repeat \
          -DataType BYTE \
          -EnableStream FALSE \
          -Offset $offset \
          -OffsetReference "CustomModifierField.pattern"]
  #set profile [stc::get $stream -AffiliatedStreamBlockLoadProfile]
  # stc::config $stream -Load $rate -LoadUnit BITS_PER_SECOND
  return $hRangeModifier
}

proc set_range_modifier { modifier offset mask method repeat } {
# Use modifier to generate multiple streams.
  puts "Setting Modifier on Stream Block"
  stc::config $modifier \
          -ModifierMode $method \
          -Mask "$mask" \
          -StepValue "0001" \
          -Data "0000" \
          -RecycleCount 65535 \
          -RepeatCount $repeat \
          -DataType BYTE \
          -EnableStream FALSE \
          -Offset $offset \
          -OffsetReference "CustomModifierField.pattern"
  #set profile [stc::get $stream -AffiliatedStreamBlockLoadProfile]
  # stc::config $stream -Load $rate -LoadUnit BITS_PER_SECOND
  return "OK"
}

proc set_stream_rate { stream rate } {
  #set profile [stc::get $stream -AffiliatedStreamBlockLoadProfile]
  stc::config $stream -Load $rate -LoadUnit KILOBITS_PER_SECOND
  return "OK"
}

# ###########################################
# Create server and wait for entry connection
# ###########################################

puts  "Waiting for connection"
set serverPort  $PORT_NUMBER
set server [socket -server newConnection $serverPort]

# wait forever
vwait forever
